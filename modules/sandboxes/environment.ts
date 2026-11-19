import type { SandboxConnector } from './connector.js';
const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;
/** A provider-independent command overlay for Harness installation, not VM-global mutation. */
export async function withSandboxEnvironment(connector: SandboxConnector, id: string, env: Record<string, string>): Promise<SandboxConnector> {
  if (!Object.keys(env).length) return connector;
  const path = '/tmp/hexagon-runtime/agent-environment.json';
  await connector.write(id, path, Buffer.from(JSON.stringify(env)));
  const permission = await connector.execute(id, `chmod 600 ${path}`);
  if (permission.exit_code !== 0) throw new Error('environment_permissions_failed');
  return new Proxy(connector, {
    get(target, property) {
      if (property === 'execute') return async (sandbox: string, command: string, options?: Parameters<SandboxConnector['execute']>[2]) => {
        if (sandbox !== id) throw new Error('environment_sandbox_mismatch');
        const source = `import os,json,base64;os.environ.update(json.load(open(${JSON.stringify(path)})));os.execvpe('/bin/sh',['/bin/sh','-c',base64.b64decode('${Buffer.from(command).toString('base64')}').decode()],os.environ)`;
        return target.execute(sandbox, `python3 -c ${quote(source)}`, options);
      };
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
