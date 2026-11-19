# Manage capacity, quotas, and cost

Track control-plane/database resources, Sandbox compute/storage, model requests, and potentially billable Tools separately. Completed Runs or sleeping Sessions do not prove that every billing component has stopped.

## Measure workload

Record task volume, active duration, peak concurrency, turns per Session, artifact size, and retention. These are capacity methods, not Provider price quotes:

- Steady-state active work is approximately arrival rate times mean active duration; account separately for bursts and tails.
- Daily artifact growth is approximately completed Runs times mean exported bytes, plus events, inputs, history, and indexes.
- Model/Tool usage follows actual requests and upstream metering; retries and verification can also consume usage.
- Stopped compute may retain disks, snapshots, or associated endpoints.

For example, 60 tasks/hour at 120 seconds of activity implies roughly two active tasks under smooth arrivals. It does not prove capacity for only two resources: arrivals burst, and provisioning/model latency has tails. Calibrate against real peak load and waiting time.

## Concurrency and account limits

A Session permits one active Run. Application queues, worker scheduling, and Provider allocation quotas are different limits. Splitting work into Sessions does not increase account quotas or preserve a shared workspace automatically.

Check current official account settings for sizes and trial limits. This page does not turn historical account constraints into permanent rules or quote dynamic prices. Use actual allocation failures and quota observations before changing concurrency.

## Idle and expiry

Idle timeout controls eligibility for a supported strategy, not a universal billing switch. Provider standby timing is independent; storage can remain billable. Control-plane downtime prevents guaranteed timely platform-managed deletion.

Close unused Sessions and confirm all owned resources. Monitor unknown/closing states. Stopping local processes is not proof of ended cloud usage. Approval waits remain active work and need an application handling policy.

## Operational controls

Bound incoming concurrency, persist recoverable IDs, observe duration/wait causes, archive necessary output, and close completed workspaces. Preserve idempotency on retry and reconcile unknown creation to avoid duplicates.

Measure startup, active execution, output volume, recovery, and cleanup confirmation on a small real workload for each combination. Include failed attempts. Compare optimizations using the same task and success criteria rather than dropping acceptance steps.

Next: [wake](../build/idle-and-wake.md), [reconciliation](reconciliation.md), [observability](observability.md). Sources: [Serverless](../../../serverless-sessions.md), [resource interface](../../../../modules/execution/sessions.ts).
