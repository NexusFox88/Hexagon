# Propose changes and prepare contributions

Describe the concrete user problem and desired behavior before selecting modules. The current [contribution guide](../../../../CONTRIBUTING.md) states that the public repository/intake are not configured. Do not invent issue/PR URLs. Prepare a local patch, design, and actual verification records until an official intake exists.

See the [Apache-2.0 LICENSE](../../../../LICENSE). This page introduces no CLA, maintainer response deadline, or unestablished governance process.

## Decide when a design is needed

A local fix can use a short problem, trigger, before/after behavior, and validation. Cross-module state, public API, credentials, tenancy, lifecycle, and migration changes need a design covering the user journey, boundaries, alternatives, failure modes, migration/rollback, verification, and documentation.

Before behavior changes read [architecture](../../../architecture.md), [acceptance](../../../../testing/acceptance.md), and the [code map](codebase.md). Do not remove requirements to satisfy existing tests. Do not scatter provider branches through generic orchestration or use raw guest credentials as a compatibility fallback.

## Learn from a concrete change

E2B OCI preparation is a cross-module example: selecting a public OCI Harness requires preparing a Session-owned Template before allocating compute. The design must cover Template/build receipts, unknown build outcomes, recovery, and compute-before-template cleanup, not only image pulling. Its [increment evidence](../../../../testing/evidence/2026-11-19-e2b-oci-preparation.md) preserves model-output failures and later scoped passes. It illustrates evidence boundaries, not a new execution for this page.

Suggested design order: problem/success journey → current constraints → object/API/state changes → alternatives/tradeoffs → credentials/tenancy → unknown outcomes/cleanup → migration/rollback → actual checks and gaps.

## Prepare reviewable work

Follow the actual [PR template](../../../../.github/PULL_REQUEST_TEMPLATE.md):

```text
Problem and resulting behavior
- Trigger, previous behavior, observable result after the change.

Affected contracts
- Relevant API / Python / TypeScript / Console / Runtime / Connector changes.

Verification actually run
- Actual commands, exit results, evidence paths, and scope.

Remaining limitations
- Unexecuted checks, known constraints, unresolved resources, next actions.
```

Describe the final implementation, not the whole discussion history. Include abandoned alternatives only when they explain a material tradeoff. UI changes require both-language and keyboard/focus/accessibility review under the [Console contract](../../../console-design.md); browser-native dialogs do not replace product components.

## Checks and evidence

Run existing package.json checks appropriate to the change using a dedicated test database. Separate deterministic fixtures from real provider/model acceptance. Check both SDKs for API changes, and failures/recovery/cleanup for lifecycle changes. Do not implicitly use personal cloud credentials in routine documentation or external-contribution pipelines.

Public reports contain sanitized conclusions; retain original resource IDs privately for cleanup. Exclude secrets, database backups, user prompts, and .local. Later passes do not erase failures. Missing evidence remains unverified.

Before handoff, align implementation, examples, related documentation, and translations and retain limitations. Commits, PR creation, and publishing depend on task authorization and actual project intake; this product-documentation task performs none of them.

Next: [documentation maintenance](documentation.md), [combination evidence](../integrations/verified-combinations.md), [reconciliation](../operate/reconciliation.md).
