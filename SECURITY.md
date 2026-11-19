# Security boundaries and reporting

Status: developer preview preparation. No stable security support policy or private vulnerability contact has been approved yet. **Public release is blocked until a working private reporting channel is recorded in `release-policy.json`.** Do not publish exploit details or credentials in public issues. Do not invent an email address; use an already established private maintainer channel if one exists.

## Trust model

The control plane is trusted with encrypted provider/model/Tool credentials and cloud resource authority. Database ciphertext and the matching master key must be protected separately and backed up together. Local discovery and browser bootstrap are local-workspace conveniences, not anonymous hosted access. Hosted mode requires explicit credentials and stable HTTPS ingress. Do not expose local management listeners to the internet.

Cloud Sandbox isolation is provided by the selected provider. Guest code and Harness plugins are untrusted relative to the control plane. Original upstream credentials stay in the control plane; scoped access grants in the guest can still authorize permitted operations. Protect their audience, lifetime and bindings. Persona/identity text never grants access to another account.

Credential-only ingress carries request content and scoped grants. A temporary tunnel introduces an external transport dependency; do not expose API/Console ports through it. Provider network policies and native pause semantics vary. A paused Session is not proof of zero billing. Control-plane-enforced resource expiry cannot run while every control-plane process is offline.

## Failure and diagnostics

Unknown creates, writes and deletes remain unknown until exact remote evidence resolves them. Do not delete local operation records or blindly repeat external writes to make a dashboard green. Close Sessions and verify cleanup before planned downtime. Follow [backup/restore](docs/local-installation.md); restoring an untrusted archive is unsafe.

For reports include release version, OS, Node/Python versions, sanitized error code, operation stage and steps using fake data. Never attach owner.json, master.key, deployment backups, raw environment dumps, request payloads or unreviewed logs/screenshots. Private resource IDs may be shared only through the eventual private reporting channel. The release scanner is defense in depth, not proof that arbitrary logs contain no secrets.

Existing tests cover tenant boundaries, local/hosted access, credential handling, approvals and lifecycle fencing. They are not an independent penetration test or a blanket security certification.
