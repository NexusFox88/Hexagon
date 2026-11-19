# Integration reading guide for coding Agents

Use this guide when building an application on Hexagon. It is product integration documentation, not repository AGENTS.md instructions. Repository instructions still govern edits, tests, credentials and publication in your checkout. This Markdown file is the reading entry point; it does not imply an available hosted documentation endpoint or a separate machine API.

## Read in execution order

| Step | Read and establish | Persist or verify |
| --- | --- | --- |
| 1. Version and deployment | [Installation](start/install.md), [SDK source guide](../../../sdk/README.md), [CLI](reference/cli.md) | Actual control-plane source/build, installed SDK artifact/version, local versus hosted authentication |
| 2. Capability discovery | [Choose integrations](integrations/choose.md), [Harnesses](integrations/harnesses.md), [verified combinations](integrations/verified-combinations.md) | Exact Harness id/version/digest, model protocol, Sandbox capabilities and dated scenario evidence |
| 3. Configuration/preflight | [Connection lifecycle](build/connection-lifecycle.md), [Sandbox policy](build/sandbox-policy.md), [initialization](concepts/initialization.md) | Ready enabled connections, ownership, requested policies and immutable Session inputs |
| 4. Session | [First Session](start/first-session.md), [backend integration](build/backend-integration.md) | Business ownership, creation intent, returned Session ID; saved Agent is optional |
| 5. Run | [Backend integration](build/backend-integration.md), [project context](build/project-context.md) | Exact input/origin, stable idempotency key and returned Run ID |
| 6. Durable observation | [Event streaming](build/stream-events.md) | Event plus cursor in one application transaction; deduplicate by Run/event ID |
| 7. Authorization/approval | [Tool authorization](build/tool-authorization.md), [approvals](build/approvals.md) | Original call and pending decision; account access and side-effect approval are separate |
| 8. Result | [Artifacts](build/artifacts.md), [private preview](build/private-preview.md) | Terminal query, actual output/file content, authenticated preview where supported |
| 9. Recovery and cleanup | [Recovery](build/recovery.md), [reconciliation](operate/reconciliation.md) | Original operation/resource IDs, externally checked outcomes and confirmed Session closure |

Do not assume an SDK package version certifies every server build. Check the running catalog and the installed SDK's actual signatures. For exact requests while the dedicated references are still being completed, use the checked-in [TypeScript SDK](../../../sdk/typescript/index.ts), [Python SDK](../../../sdk/python/hexagon/__init__.py) and [HTTP implementation](../../../apps/control-plane/server.ts). These are source references, not promises of an OpenAPI endpoint.

## Integration algorithm with a durable journal

The following is pseudocode. `journal`, business authorization and transactions are application-owned, not Hexagon SDK methods. The concrete Python and TypeScript calls are in the linked build guides and [first-Session examples](../../../examples/documentation/first-session.py).

```text
authorize business user against the work context
load/create a private journal for this business request
record selected connections, exact Harness version, policy and creation intent

if Session ID is absent:
    if a previous create request has an unknown outcome:
        investigate Sessions and resource operations; stop automatic creation
    create Session once; persist returned Session ID

commit submission intent:
    Session ID, exact input, exact origin, one stable idempotency key
submit that saved intent; persist returned Run ID
if submission response is lost:
    retry the same Session/input/origin/key with bounded transport backoff
    never generate a new key to conceal a conflict

cursor = last committed event ID, or string "0"
observe original Run after cursor
for each event with an ID:
    transactionally deduplicate/store event and advance cursor
for stream loss:
    reconnect to the same Run with the committed cursor
for authorization/approval wait:
    surface the original request to the permitted decision-maker
for unknown Tool result:
    record call ID, request hash and dispatch policy
    investigate externally; do not re-dispatch the write

query the Run for its terminal state and final output
verify/download authorized artifacts; preserve intended follow-up context
when the Session is no longer needed:
    record close intent; request closure; verify confirmed cleanup
    retain pending operation/resource IDs until reconciliation finishes
```

Record at least business request/owner, Session ID, Run ID, exact submission payload/key, event cursor, cleanup intent/status and unresolved operation references. Resource identifiers belong in private evidence, not public example output. Store timestamps and errors without logging Tokens or original account credentials. Every external lookup and result delivery still requires application authorization, even when several business users share one Hexagon tenant.

Run submission idempotency does not extend to Session creation or arbitrary provider operations. Event IDs should remain numeric strings, not JavaScript Numbers. An event without a durable ID, such as `stream.end`, is not a cursor checkpoint. A drained stream or empty event page does not replace the terminal Run query. A network disconnect does not cancel execution.

## Conditions that change the next action

| Condition | Action |
| --- | --- |
| Unsupported model protocol/network/Tool capability | Correct selection before allocation; do not silently weaken the requested policy |
| `session_busy` | Keep the application message pending until the active Run settles, or use a deliberately separate Session |
| Idempotency conflict | Compare stored input/origin/key; do not manufacture a new request to hide the conflict |
| Authentication/permission error | Correct identity or authorization; do not loop transient retries |
| Missing Tool authorization | Obtain authorized account access through the existing flow; do not pass upstream keys to the guest |
| Pending write approval | Wait for a permitted decision; a model instruction is not approval |
| Unknown create/write/delete outcome | Reconcile the original operation; absence of a response is not proof of failure |
| Failed or cancelled Run | Inspect output, events and possible side effects before another task; cancellation does not undo writes |
| Unconfirmed cleanup | Retain the journal and provider identifiers; do not mark the account free of orphan resources |

## Use examples and evidence accurately

Examples have different scopes: a complete tutorial, an SDK excerpt requiring existing variables, a structural sketch, or a deterministic fixture. Read the label and prerequisites before executing. Placeholder connection IDs, `.invalid` domains and local image tags are not deployed services. A fixture model does not prove real model behavior; a registered Harness does not prove that image/provider/protocol combination works.

For each integration change, report the files changed, actual commands and outcomes, exact tested scope, limitations and cleanup status. Preserve failed attempts. Follow [testing and evidence](contribute/testing.md) and both SDK journeys where the change affects their shared contract. Do not use generated Agent text as proof that tests passed: inspect actual test output and artifacts.

The linked product pages are checked-in documentation drafts. This page links existing files; it does not claim that a public documentation site, `llms.txt` service, or every planned reference page has been published. Use the [coverage ledger](../coverage.json) to identify unfinished content, never to infer runtime capability.

Next: [first Session](start/first-session.md), [backend integration](build/backend-integration.md), [reconciliation](operate/reconciliation.md).
