# Capabilities, compatibility, and evidence

“Supported” can mean an implemented interface, a reachable account, one successful task, or a verified recovery journey. Identify the evidence behind the claim before choosing a combination.

| Information | Establishes | Does not establish |
| --- | --- | --- |
| Adapter capability | Declared implementation of an interface | Your quota, account, or network readiness |
| Connection verification | That adapter's configured check passed | Every operation executed; generic HTTP checks can be structural |
| Session preflight | Known structural compatibility | Future allocation or model execution success |
| One real turn | That task succeeded for that combination | All multi-turn, approval, preview, or sleep behavior |
| Independent dual-SDK journey | Both clients completed recorded steps | Every version, endpoint, or concurrent workload |
| Fault/cleanup test | A specified failure branch recovered | No other unresolved resources exist in the account |

## Capability ownership

Sandbox adapters declare resource/network capabilities. Harnesses declare conversation, Tools, and initialization. Tool adapters participate in approval capability. One layer cannot grant another layer's capability. Required capabilities express conditions, not feature switches.

A buildable OCI recipe still fails compatibility when the Provider lacks `oci_image`. A verified model endpoint does not prove all Harness tool-calling and continuation behavior.

## Read an evidence row

Check Provider, Harness version/image digest, model endpoint/protocol, SDK, task scope, date, and cleanup. Separate passed, failed, unrun, and explicitly unsupported outcomes. Keep unknown outcomes unknown.

Historical results prove their recorded executions. Current preflight keeps verification unverified instead of automatically certifying new configuration from old successes. Account, endpoint, or deployment changes may require fresh evidence.

## Establish your own evidence

Begin with a verified combination. Record the task and checks, prove a minimal result and cleanup, then test the files, Tools, approvals, previews, and recovery your application needs. Run each SDK independently when both are required. Record actual commands and failed attempts as well as successes. Keep real resource identifiers in private local evidence and publish redacted summaries.

Sources: [resolver](../../../../modules/execution/compatibility.ts), [acceptance](../../../../testing/acceptance.md), [matrix](../../../../testing/execution-matrix.md). Next: [network verification](../build/sandbox-policy.md), [first Session](../start/first-session.md).
