# Register and run an OCI Harness

New Harness integrations use OCI images. Registration resolves metadata and pins a Linux amd64 manifest digest. It is not Agent execution or proof of runtime success.

Use an owner identity, an approved Docker Hub/GHCR reference, and compatible Sandbox/model connections. Arbitrary registry URLs are not supported fetch targets.

## Register and preflight

Continue with an initialized management client. The reference must contain a real matching program; this example selects opencode-v1.

```python
harness = client.register_harness(
    image=image_reference, id='custom.project-agent', version='1.0.0',
    protocol='opencode-v1', capabilities=['conversation', 'tools'],
)
definition = dict(harness={'id': harness['id'], 'version': harness['version']},
                  sandbox_connection_id=sandbox_connection_id,
                  model_connection_id=model_connection_id)
client.preflight_session(**definition)
session = client.create_session(**definition)
```

```typescript
const harness = await client.registerHarness({
  image: imageReference, id: 'custom.project-agent', version: '1.0.0',
  protocol: 'opencode-v1', capabilities: ['conversation', 'tools'],
});
const definition = { harness: { id: harness.id, version: harness.version },
  sandbox_connection_id: sandboxConnectionId, model_connection_id: modelConnectionId };
await client.preflightSession(definition);
const session = await client.createSession(definition);
```

Follow the [first Session](../../start/first-session.md) persistent-submission pattern for execution, artifact checks, and cleanup. Record the returned digest, not only the mutable tag. Identical registration is idempotent; changed id/version conflicts require a new version. Source packages share that namespace.

Command defaults to Entrypoint + Cmd; protocol comes from the image label or default JSON contract. Inspect defaults rather than assuming an arbitrary CLI image works.

## Provider boundaries

Modal and Fly Machines support native OCI, with public images only on Fly. E2B now prepares public OCI through a Session-owned Template, with separate build/create records and compute-before-template cleanup. Its additional combinations remain individually unverified until evidence exists.

Modal derives Runtime prerequisites as root. Current code reapplies image USER, while existing runtime notes report root execution; USER is not a verified security boundary. Verify actual uid when identity matters; see [Modal integration](../sandboxes/modal.md). Fly may also install prerequisites and execute as root. Source-image digest does not mean the runtime filesystem was never changed during preparation.

Private registry access uses an enabled username/password JSON Secret, not ordinary Agent environment. Private-image capability is separate from public OCI. Verify resolution, pull, execution, Tools, and cleanup independently.

## Build and diagnose

`node --import tsx tooling/build-harness-images.ts all` builds repository templates without pushing. It may download dependencies and create local images; inspect template prerequisites. A recipe is not a published artifact.

Distinguish missing entrypoint, architecture, registry authorization, Runtime prerequisites, model protocol, and result interpretation. Lost build receipts require reconciliation of the original operation, not automatic duplicate builds. Retain and clean up failed templates/resources.

Sources: [image contract](../../../../harness-images.md), [registration](../../../../../modules/harnesses/images.ts). Next: [model protocols](../model-protocols.md), [recovery](../../build/recovery.md).
