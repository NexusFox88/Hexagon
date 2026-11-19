import { sandboxConnections, createSandboxConnector } from '../integrations/sandboxes/registry.js';
/** Isolated worker entrypoint for actual crash/restart acceptance. */
import { readFile } from 'node:fs/promises';
import { openDatabase } from '../modules/storage/database.js';
import { SecretCipher, SecretStore } from '../modules/credentials/secret-store.js';
import { SandboxLifecycle } from '../modules/sandboxes/lifecycle.js';
import { HarnessPackages } from '../modules/execution/harness-packages.js';
import { HarnessRegistry } from '../modules/execution/harness.js';
import { ExecutionWorker } from '../modules/execution/worker.js';
import { openCodeAdapter } from '../integrations/harnesses/opencode.js';
import { piAdapter } from '../integrations/harnesses/pi.js';
const pool = openDatabase(process.env.HEXAGON_WORKER_DATABASE!);
const secrets = new SecretStore(pool, new SecretCipher(await readFile(process.env.HEXAGON_WORKER_KEY_FILE!)));
const lifecycle = new SandboxLifecycle(pool, secrets, createSandboxConnector);
const worker = new ExecutionWorker(pool, secrets, lifecycle, new HarnessRegistry([openCodeAdapter, piAdapter], new HarnessPackages(pool)));
worker.start();
const report = () => process.send?.({ id: worker.id, health: worker.health() });
report(); const timer = setInterval(report, 500);
let stopping = false;
async function stop() {
  if (stopping) return; stopping = true; clearInterval(timer);
  await worker.stop(); await pool.end(); process.disconnect?.();
}
process.on('SIGTERM', () => { void stop(); });
process.on('SIGINT', () => { void stop(); });
