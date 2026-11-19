/** Stable control-plane execution errors shared by schemas and orchestration. */
export class ExecutionError extends Error {
  constructor(public code: string, public status: number) { super(code); }
}
