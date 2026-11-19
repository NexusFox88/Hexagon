# Credentials, authorization, and trust boundaries

Managing cloud accounts, models, and Tools should not give task code their original administrative credentials. Hexagon separates protected connections from ordinary execution configuration and checks tenant ownership on resource reads and bindings.

| Credential | Path | Boundary |
| --- | --- | --- |
| Owner/application Token | Control-plane client authentication and route permissions | Keep out of browsers/Sandboxes; still authorize business users |
| Provider credential | Control-plane connector | Not ordinary Harness environment |
| Model/protected HTTP key | Encrypted connection, upstream injection by access backend | Guest gets bounded authority or placeholder, not original account key |
| Tool OAuth/Token | Control-plane broker and refresh | Selection, authorization, and approval remain distinct |
| OCI registry credential | Metadata resolution / permitted image build pull | Separate from ordinary Agent environment |
| User env/variables | Encrypted at rest, injected for execution | Readable by Agent and child processes |
| Preview ticket | Exchanged for an isolated-origin cookie | The URL grants access; do not publish it |

## Secrets, connections, and grants

A managed Secret stores encrypted values without returning them through reads. A Connection references credentials and defines upstream policy. A Session binding grants use, not an API for retrieving the original secret.

The protected proxy enforces configured destinations and request policy rather than arbitrary caller-selected upstreams or authentication headers. Delegated tokens still carry authority and need lifecycle limits; they are not original account keys.

Rotation/disablement affects subsequent requests, while already-admitted operations may finish. Logical deletion retains historical encrypted records and is not proof of physical cryptographic erasure. Database recovery requires its matching encryption key.

## Identity and approval

Behavioral identity/instructions are prompt content, not authentication. Tenant checks protect control-plane ownership. Applications serving multiple business users within one tenant still need business ownership checks.

Authorization supplies usable account credentials; approval permits a specific operation. Ordinary application Tokens cannot decide management approvals. Cancellation, revocation, and connection deletion cannot retroactively undo external writes.

Keeping original credentials out of the guest does not mean an Agent cannot modify data through permitted operations. Review operation selection, arguments, and approvals. Generated HTML, Tool responses, and uploaded files remain untrusted content; their instructions do not grant permissions.

Sources: [Secret contract](../../../secret-management.md), [Token permissions](../../../../modules/credentials/application-tokens.ts), [OCI credentials](../../../harness-images.md). Next: [Tools](../build/tools.md), [approvals](../build/approvals.md), [previews](../build/private-preview.md).
