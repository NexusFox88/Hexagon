# Use cases and product boundaries

Hexagon supplies common Session, Run, and cloud-resource management when an application needs observable, continuing, recoverable Agent work.

## Common applications

| Scenario | Input and result | Considerations |
| --- | --- | --- |
| In-product project changes | Code and requirements become changed files, test results, and previews | File permissions, Tools, artifact limits, preview lifecycle |
| Multi-turn automation | Continue refining results in the same workspace | One active Run, conversation continuity, provider-specific idle recovery |
| External business systems | Read requirements and write a report after authorization/approval | Credential scope, zero preapproval writes, unknown-outcome reconciliation |
| Multiple execution combinations | A shared SDK chooses cloud environments and Harnesses | Preflight, model protocol, exact-combination evidence |

## Decide whether to add a control plane

For a one-off task in your terminal, you can run the Harness directly. If you intend to implement scheduling, durable state, credentials, and cleanup yourself, you can use a Sandbox API directly.

Hexagon fits when those lifecycle capabilities should be application infrastructure. It also means operating a control plane/database, managing provider/model accounts, and monitoring unresolved cloud operations.

## Understand the boundaries

- **Model protocols:** Messages, Chat Completions, and Responses depend on Harness and endpoint support. Automatic protocol conversion/fallback is not promised.
- **Preview:** authorized, expiring access to a Session's running Web service; not generic production deployment.
- **State:** Run results, workspace files, Harness conversation, and process memory have different persistence boundaries.
- **Recovery:** a disconnected client can observe the original task again; lost external-write responses require reconciliation, not unconditional retry.
- **Identity:** your application still authorizes its business users against their tasks. Control-plane tenant checks do not replace business permissions.
- **Compatibility:** a supported provider does not imply every OCI image, model protocol, or network policy works.

Start with an evidenced combination meeting your requirements. Consult [model protocols](../integrations/model-protocols.md), [Sandbox capabilities](../integrations/sandboxes.md), and [verified combinations](../integrations/verified-combinations.md).

Next: [install and start](install.md).
