import type { SandboxConnector } from '../modules/sandboxes/connector.js';

/** Acceptance-only adapter decorator. Actual provider operations still execute. */
export class ResourceFaults {
  private targetOperation?: string;
  readonly evidence = { creates: 0, delete_attempts: 0, actual_deletes: 0, created_resource: '', reconciliations: 0 };
  wrap(connector: SandboxConnector, save: () => Promise<void>): SandboxConnector {
    return {
      expiry: connector.expiry,
      preflight: connector.preflight?.bind(connector),
      create: async request => {
        this.targetOperation ??= request.operation_id;
        if(request.operation_id !== this.targetOperation)return connector.create(request);
        this.evidence.creates++;
        const resource = await connector.create(request);
        this.evidence.created_resource = resource.id;
        await save();
        throw new Error('injected_create_response_lost');
      },
      findByOperation: async operation => {
        if(operation !== this.targetOperation)return connector.findByOperation(operation);
        this.evidence.reconciliations++;
        const result = await connector.findByOperation(operation); await save(); return result;
      },
      destroy: async id => {
        if(id !== this.evidence.created_resource)return connector.destroy(id);
        this.evidence.delete_attempts++;
        await save();
        if (this.evidence.delete_attempts === 1) throw new Error('injected_delete_transport_failure');
        await connector.destroy(id);
        this.evidence.actual_deletes++; await save();
        throw new Error('injected_delete_response_lost');
      },
      ...(connector.cleanupAssociatedResources ? { cleanupAssociatedResources: connector.cleanupAssociatedResources.bind(connector) } : {}),
      inspect: connector.inspect.bind(connector), execute: connector.execute.bind(connector),
      read: connector.read.bind(connector), write: connector.write.bind(connector), preview: connector.preview.bind(connector),
    };
  }
}
