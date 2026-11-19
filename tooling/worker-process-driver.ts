import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';

/** Controls only the subprocess created for this isolated acceptance schema. */
export class WorkerProcessDriver {
  private child?: ChildProcess;
  private exited?: Promise<void>;
  private status: unknown = { state: 'not_started' };
  constructor(private database: string, private keyFile: string) {}
  health() { return this.status; }
  start() {
    if (this.child) throw new Error('worker_already_started');
    this.child = spawn(process.execPath, ['--import', 'tsx', resolve('tooling/worker-process.ts')], {
      env: { ...process.env, HEXAGON_WORKER_DATABASE: this.database, HEXAGON_WORKER_KEY_FILE: this.keyFile },
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    });
    this.child.on('message', (message: any) => { if (message.health) this.status = message.health; });
    this.exited = new Promise((done, reject) => {
      this.child!.once('exit', () => { this.status = { state: 'stopped' }; done(); });
      this.child!.once('error', reject);
    });
  }
  async crash() {
    if (!this.child || this.child.exitCode !== null || this.child.signalCode !== null) throw new Error('worker_not_running');
    this.child.kill('SIGKILL'); await this.exited; this.child = undefined;
  }
  async stop() {
    if (!this.child) return;
    this.child.kill('SIGTERM'); await this.exited; this.child = undefined;
  }
}
