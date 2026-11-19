# Session experience and serverless lifecycle

User scope: compact Harness cards and correct identities; Provider names/icons in Tools and Sandbox lists; meaningful execution colors and Harness terminology; global 24h/7d activity; independent pause/close; Playground first and prerequisite configuration in new tabs.

User correction: sleeping Sessions accept new messages, persist the Run and wake automatically. Manual resume must not be a prerequisite.

## Implementation

1. Shared provider identity, official self-hosted Hermes/OpenClaw assets, compact template grid, shared semantic execution colors.
2. Tenant-wide activity query, 24 hourly or 7 daily rolling buckets, distinct Sessions whose Run interval overlaps each bucket. Current count includes queued/executing/waiting tasks; idle and sleeping counts are separate.
3. Durable Session pausing/paused/resuming states and lifecycle audit records. Idle-only transitions serialized with resource mutations and Run submission.
4. Both SDKs accept tasks on sleeping Sessions. Worker reconciles pending transition, wakes the same resource, then proceeds through existing Runtime/Harness invocation handling. Request idempotency remains unchanged.
5. Default 60-second compute idle policy (configurable idle_timeout_seconds, minimum 15 seconds), enforced only for connectors advertising memory-preserving pause_resume. Effective idle is capped below the active resource lease deadline.
6. E2B native pause/resume, real dual-SDK lifecycle and conversation continuation. Other connectors retain compute; they do not advertise serverless compute support.
7. Playground first navigation entry, four contextual new-tab setup links in a blank workspace, draft preservation and refresh only after configuration changes.
8. Bilingual browser and narrow layout review, wheel/keyboard scroll verification, full regression and explicit evidence.

## Limits and follow-up boundary

Serverless compute is verified on E2B, not all existing Sandbox providers. Remaining providers need memory-preserving native sleep/wake or an explicitly designed durable workspace restoration strategy before advertising the same guarantee. No destroy/recreate fallback silently discards filesystem or native Harness history.

Unknown pause/wake results remain transitional and are inspected, never blindly replayed. New messages remain durable while wake is unresolved. Runtime execution still allows one nonterminal Run per Session; concurrent different submissions receive the existing busy response.

Session sleep is not closure. E2B confirmed native sleep suspends the compute lease deadline; wake establishes a fresh bounded running lease. Explicit close destroys resources while retaining conversation/artifacts. Unsupported compute remains billed according to its provider.

See testing/evidence/2026-11-19-session-experience.md for actual results.
