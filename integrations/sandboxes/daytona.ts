import { randomUUID } from 'node:crypto';
import { Daytona, DaytonaNotFoundError, DaytonaGoneError, type Sandbox } from '@daytona/sdk';
import { z } from 'zod';
import type { ConnectionAdapter } from '../../modules/connections/connections.js';
import type { SandboxConnector, SandboxRequest, SandboxResource } from '../../modules/sandboxes/connector.js';

const configSchema = z.object({
  api_url: z.string().url().default('https://app.daytona.io/api'),
  snapshot: z.string().min(1).optional(), target: z.string().min(1).optional(),
}).strict();
function client(config: z.infer<typeof configSchema>, credential: string) {
  return new Daytona({ apiKey: credential, apiUrl: config.api_url, requestTimeoutMs: 30000 });
}
export const daytonaConnection: ConnectionAdapter = {
  kind: 'sandbox', provider: 'daytona', config: configSchema,
  capabilities: ['files', 'commands', 'preview'],
  async validate(config, credential) {
    const api = client(configSchema.parse(config), credential);
    const iterator = api.list();
    try { await iterator.next(); } finally { await iterator.return?.(); }
    return { operations: ['list_sandboxes'] };
  },
};

export class DaytonaConnector implements SandboxConnector {
  private readonly api: Daytona;
  private readonly config: z.infer<typeof configSchema>;
  constructor(config: Record<string, unknown>, credential: string) {
    this.config = configSchema.parse(config); this.api = client(this.config, credential);
  }
  private resource(sandbox: Sandbox): SandboxResource {
    const states: Record<string, string> = { started: 'running', destroyed: 'destroyed', stopped: 'stopped', archived: 'stopped' };
    return { id: sandbox.id, state: states[sandbox.state || ''] || sandbox.state || 'unknown', memory_mb: sandbox.memory * 1024,
      ...(sandbox.autoDestroyAt ? { expires_at: sandbox.autoDestroyAt } : {}) };
  }
  async create(request: SandboxRequest) {
    if (request.network.mode !== 'unrestricted') throw new Error('network_policy_unsupported');
    // The operation-specific name and labels permit reconciliation after a lost
    // response. Lifecycle owns retry decisions; never blindly create again here.
    const sandbox = await this.api.create({ name: `hexagon-${request.operation_id}`, snapshot: this.config.snapshot, target: this.config.target,
      labels: { hexagon_operation: request.operation_id, hexagon_session: request.session_id }, public: false,
      autoStopInterval: 0, autoPauseInterval: 0, autoDeleteInterval: 0, ttlMinutes: Math.ceil(request.timeout_seconds / 60),
    }, { timeout: 120 });
    return this.resource(sandbox);
  }
  async findByOperation(operation: string) {
    const resources = [];
    for await (const sandbox of this.api.list({ labels: { hexagon_operation: operation } })) resources.push(this.resource(sandbox));
    return resources;
  }
  async inspect(id: string) {
    try { const sandbox = await this.api.get(id); return sandbox.state === 'destroyed' ? null : this.resource(sandbox); }
    catch (error) { if (error instanceof DaytonaNotFoundError || error instanceof DaytonaGoneError) return null; throw error; }
  }
  async destroy(id: string) {
    try { await this.api.delete(await this.api.get(id), 90, true); }
    catch (error) { if (!(error instanceof DaytonaNotFoundError || error instanceof DaytonaGoneError)) throw error; }
  }
  async execute(id: string, command: string, options: { timeout_seconds?: number; background?: boolean } = {}) {
    const sandbox = await this.api.get(id);
    const session = `hexagon-${randomUUID()}`;
    await sandbox.process.createSession(session);
    try {
      const result = await sandbox.process.executeSessionCommand(session, { command, runAsync: options.background ?? false }, options.timeout_seconds ?? 60);
      return { stdout: result.stdout ?? result.output ?? '', stderr: result.stderr ?? '', exit_code: options.background ? null : result.exitCode ?? null };
    } finally {
      // Async sessions own the Runtime process until the Sandbox is destroyed.
      if (!options.background) await sandbox.process.deleteSession(session);
    }
  }
  async write(id: string, path: string, bytes: Uint8Array) { await (await this.api.get(id)).fs.uploadFile(Buffer.from(bytes), path); }
  async read(id: string, path: string) { return (await this.api.get(id)).fs.downloadFile(path); }
  async preview(id: string, port: number) {
    const link = await (await this.api.get(id)).getPreviewLink(port);
    if (!link.token) throw new Error('private_preview_token_missing');
    return { url: link.url, headers: { 'X-Daytona-Preview-Token': link.token } };
  }
}
