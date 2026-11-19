# Changes and upgrade notes

This page records dated, user-visible changes in the current source workspace. It is not a list of published releases. [release-policy.json](../../../release-policy.json) currently identifies developer-preview preparation and does not approve publication; repository/package ownership and release reviews are still pending. Python and TypeScript package manifests currently say `0.1.0`; that number alone does not distinguish every development snapshot or establish registry publication.

Record the exact source/distribution fingerprint, lockfile, SDK artifacts and database migration inventory for your installation. A locally built distribution has release.json metadata. Follow [upgrade and migration](operate/upgrades.md) before changing an installation. Dates below identify evidence checkpoints, not a promise that a new version is available from a public download channel.

## 2026-11-19 — E2B public OCI preparation

**Impact.** E2B can prepare public OCI Harness images as Session-owned templates, separately tracking template/build operations before compute creation. This adds a build stage and cleanup responsibility. It does not enable private registry images or a cross-Session template cache. Built-in Harness Sessions continue using their configured template.

**Action.** Check the [E2B prerequisites](integrations/sandboxes/e2b.md) and [OCI registration](integrations/harnesses/oci.md). Choose a compatible immutable Harness definition and a new Session. Allow preparation to finish; do not submit another build merely because a response is lost. Retain template/build operation references until both compute and owned template cleanup are confirmed. Session SDK shape is unchanged by this increment.

**Verify.** Inspect initialization, preparation state, actual execution and cleanup. The [dated evidence](../../../testing/evidence/2026-11-19-e2b-oci-preparation.md) covers a specific OpenCode digest, installed Python with Chat Completions and TypeScript with Anthropic Messages, actual file hashes/native state across pause, MCP, artifacts and cleanup. It does not certify every SDK/protocol cross-product, Responses or every E2B Harness. Earlier failed attempts remain failures. The increment's cleanup audit excludes separately parked historical operations.

## 2026-11-19 — Harness pause/wake and Playground presentation

**Impact.** Serverless verification distinguishes actual file/conversation restoration per Harness and provider. Console presents SDK and REST API as sibling representations and corrects dark-theme application icon treatment. Switching a code representation preserves the draft and does not submit a task.

**Action.** Read [serverless lifecycle](concepts/serverless-lifecycle.md) and [idle/wake](build/idle-and-wake.md). Review the exact combination before expecting memory or filesystem restoration. Use a new Session when changing a fixed Harness definition. Do not interpret provider standby as confirmed deletion, or a filesystem restore as preservation of every running process.

**Verify.** Follow-up execution must retain the intended file bytes and conversation state and finish with confirmed cleanup. [The dated serverless record](../../../testing/evidence/2026-11-19-harness-serverless-ui.md) documents actual failures, fixes and UI review; [verified combinations](integrations/verified-combinations.md) explains matrix scope. The earlier matrix's OCI exclusions describe its snapshot; the separate E2B increment above adds scoped evidence afterward. Do not rewrite older rows as if they tested the newer implementation.

## 2026-11-18 — Inspect historical Session initialization

**Impact.** Console and both SDKs can read a Session's effective initialization snapshot: pinned definition, source Agent revision where applicable, environment names and explicit redaction metadata. It describes historical initialization, not current Runtime health or a credential-bearing replay specification.

**Action.** Update the installed SDK if it lacks Python `session_initialization` or TypeScript `sessionInitialization`. Use the snapshot when diagnosing which configuration a Session actually received. Do not reconstruct credentials from it or expect renaming a connection to change historical initialization.

**Verify.** Read the same Session through both clients and compare snapshots; confirm foreign-tenant access is denied and secret values remain absent. [The evidence](../../../testing/evidence/2026-11-18-session-initialization.md) includes installed-package tests, read-only inspection of an existing cloud Session and bilingual browser review. That inspection was not a new cloud execution. See [initialization](concepts/initialization.md).

## 2026-11-18 — Remote MCP, Feishu/Lark and Responses integration

**Impact.** Remote MCP adds discovered, selected Tool schemas through the shared broker. Feishu/Lark adds application credential exchange and fixed operations. OpenAI Responses is a distinct model protocol; it is not automatically implied by a working Chat Completions connection.

**Action.** Follow [MCP](integrations/mcp.md), [application accounts](integrations/apps.md) and [model protocols](integrations/model-protocols.md). Revalidate changed MCP definitions before new use. Select Responses explicitly with a compatible Harness. Existing immutable OCI registrations keep their definitions; expanded compatibility metadata does not mutate them. Register a new version and create a new Session where needed.

**Verify.** Check selected operations, authorization/approval and the actual model protocol. [The original increment](../../../testing/evidence/2026-11-18-mcp-lark-responses.md) separates real DeepWiki MCP cloud journeys from Feishu/Lark deterministic coverage and real CLI binaries against fixture Responses servers. Later matrix evidence may expand specific combinations; the initial record alone does not prove real Lark accounts or a live Responses model passed. Arbitrary MCP OAuth onboarding is not provided by that change.

## 2026-11-17 — Direct Session entry; saved Agent optional

**Impact.** Applications can create Sessions using Harness, Sandbox/model connection IDs, optional Tools and environment directly. Saving an AgentDefinition is optional. The Console entry emphasizes Sessions, runtime connections and Tool connections. Existing saved-Agent requests remain supported.

**Migration action.** After taking a matching offline backup and settling existing resources, apply the intended source update using [the upgrade procedure](operate/upgrades.md). Migration 016 makes Agent references nullable while preserving existing data. Update application readers to handle null `agent_id` / Agent revision for direct Sessions. Remove any application-only requirement that users must save an Agent before starting; keep the reusable-Agent path where it serves a real need. Do not rewrite old Session definitions.

**Verification example.** Create a direct Session through each SDK without creating an Agent; submit a real task, verify the final result, query its nullable Agent reference, then close and confirm provider deletion. Test optional Tool binding separately. [The dated checkpoint](../../../testing/evidence/2026-11-17-minimal-session-console.md) records independent Vercel/Pi journeys with an existing SiliconFlow connection, one with Exa, plus package/API/browser checks. It reused credentials and did not rerun every provider, authorization or full Web scenario. This is a source-change migration example, not a fabricated named release.

## Documentation revisions — 2026-11-19

The bilingual product documentation adds task-oriented start/build/integration/concept/operation/reference/contribution pages, an [Agent reading guide](agents.md), and a [coverage ledger](../coverage.json). Drafts and incomplete assets remain identified. Documentation edits alone do not add runtime capabilities, create verified combinations or publish the site.

The structural checker validates inventory and selected Markdown structure/link targets. It does not certify prose, executable examples or real-cloud behavior. Keep documentation verification separate from the product-change evidence linked above.

## Before adopting any change

Use the [upgrade procedure](operate/upgrades.md) and [backup/restore guide](operate/backup-restore.md): record current versions, settle Runs and resource operations, retain matching old code/backup, apply migrations, and verify the affected SDK/user journeys. Do not edit applied migration checksums or run old code against a newer database to force rollback. Restoring a matching older backup loses later database writes and does not reverse external side effects.

Next: [upgrades](operate/upgrades.md), [verified combinations](integrations/verified-combinations.md), [known failure recovery](operate/reconciliation.md).
