# Verified execution combinations

Evaluate Sandbox, Harness version/image digest, model endpoint/protocol, SDK, scenario, and date together. Catalog capabilities do not establish acceptance for every intersection. This page maps repository evidence; it is not live service status or account health.

## Choose the behavior you need

| Question | Primary evidence | Does not establish |
| --- | --- | --- |
| Does a real task execute? | [MiniMax task matrix](../../../../testing/evidence/2026-11-18-minimax-matrix.md) and JSON | Every model, later image, or account works |
| Did an earlier full Web journey pass? | Individual records in the [execution index](../../../../testing/execution-matrix.md) | An older index statement is current status |
| Does idle continuation work? | [Harness serverless matrix](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json) and [notes](../../../../testing/evidence/2026-11-19-harness-serverless-ui.md) | Single-turn success proves recovery |
| Is there newer E2B public OCI evidence? | [E2B OCI increment](../../../../testing/evidence/2026-11-19-e2b-oci-preparation.md) | Every Harness or SDK/protocol cross-product passed |
| Which exact image? | [Pinned combination records](../../../../modules/harnesses/verification.ts) | A mutable tag still identifies the same content |
| How was MCP verified? | [MCP acceptance](../../../../testing/evidence/2026-11-18-mcp-lark-responses.md) | Deterministic SSE equals public-service live SSE |
| What is the acceptance contract? | [User journey ledger](../../../../testing/acceptance.md) and implementation | Existing tests replace missing user requirements |

## Evidence snapshots

Counts below were derived from JSON rows.status during this documentation update. They describe each file's recorded timestamp. The first counts combinations; the second counts SDK rows. Do not add them into a total of passed combinations. Regenerate the table if the source files change.

| Source | checked_at | rows.status | Count |
| --- | --- | --- | ---: |
| [2026-11-18-minimax-matrix.json](../../../../testing/evidence/2026-11-18-minimax-matrix.json) | 2026-11-18T14:54:52.956Z | `passed` | 84 |
| [2026-11-18-minimax-matrix.json](../../../../testing/evidence/2026-11-18-minimax-matrix.json) | 2026-11-18T14:54:52.956Z | `unsupported_model_protocol` | 132 |
| [2026-11-18-minimax-matrix.json](../../../../testing/evidence/2026-11-18-minimax-matrix.json) | 2026-11-18T14:54:52.956Z | `unsupported_oci_provider` | 81 |
| [2026-11-18-minimax-matrix.json](../../../../testing/evidence/2026-11-18-minimax-matrix.json) | 2026-11-18T14:54:52.956Z | `unverified_build_required` | 66 |
| [2026-11-19-harness-serverless-matrix.json](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json) | 2026-11-19T04:01:50.759Z | `passed` | 38 |
| [2026-11-19-harness-serverless-matrix.json](../../../../testing/evidence/2026-11-19-harness-serverless-matrix.json) | 2026-11-19T04:01:50.759Z | `unsupported_oci_provider` | 72 |

## Read an individual record

1. **Identity:** inspect builtin version or full OCI digest/protocol/command. Built-in and OCI OpenCode are distinct distributions.
2. **Model:** check actual endpoint, model ID, and Messages/Chat Completions/Responses. A shared vendor does not imply equivalent protocols.
3. **Client:** inspect independent Python/TypeScript results, installed versions, and scenarios. A Python Harness does not prove Python SDK acceptance.
4. **Branches:** check task, upload, Tools, approval, replay, artifacts, continuation, and recovery separately. Limited contracts such as Aider must not receive credit for untested Tools/artifacts.
5. **Cleanup:** separate successful Session teardown, earlier failed-attempt resources, and account-wide resource audits.

The task matrix retains attempts. A final passed row can still include earlier failures or unknown creations. Do not erase history or infer no global orphan resources from passing rows. Keep exact resource IDs in private evidence for reconciliation; public documentation links sanitized summaries.

## Status and evidence types

| Category | Meaning/action |
| --- | --- |
| Passed | Only the recorded versions, conditions, SDKs, and scenarios |
| Supported but unverified | Implementation/declaration exists; target live scope is missing |
| Failed | An attempt did not meet assertions; preserve cause and cleanup state |
| Blocked / unknown | Credentials, quota, network, or remote outcome unresolved; not a pass |
| Conditional pass | Successful only under explicit conditions; retain them |
| Unsupported | The then-current contract excluded the combination; not a failed execution, and newer implementation needs newer evidence |

Contract/simulation tests prove deterministic logic; live tasks record remote behavior for that run. Registry implemented/live_resource tags do not substitute for exact end-to-end records. Documentation structure checks do not verify examples or cloud behavior.

## A concrete temporal change

The old MiniMax matrix's unsupported E2B OCI rows describe that snapshot. Later E2B Session-owned Template preparation gained scoped OpenCode evidence: Python/Chat and TypeScript/Messages, file byte hashes, and native Session ID checks. That does not cover Responses or every SDK/protocol intersection.

The increment retains exact-output failures alongside later passes with clarified prompts; earlier failures are not retroactively passed. Its resource audit covers that increment, excluding separately retained historical operations. Apply the same discipline to other provider versions and recovery changes.

## Establish deployment-specific evidence

Use the [compatibility runner guide](../../../../testing/compatibility-runner.md) and [acceptance journey](../../../../testing/acceptance.md), pinning combinations and independently running both SDKs. These commands allocate resources and consume model usage; do not run them implicitly as ordinary documentation checks.

Record date, control-plane revision, SDK versions, provider/template, Harness version/digest, model endpoint/protocol, actual command, result, failure branches, and cleanup. Passed means observed; unexecuted work is planned; uncertainty stays unknown. Never log credentials. Retain resource IDs in private local evidence and [reconcile](../operate/reconciliation.md) uncertain creation/writes.

No new cloud acceptance was executed for this page. Next: [choose a combination](choose.md), [Sandbox capabilities](sandboxes.md), [model protocols](model-protocols.md).
