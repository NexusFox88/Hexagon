# Python independent task with actual Console authorization

Command: `HEXAGON_PYTHON_GUI_AUTH=1 HEXAGON_BOTH_SDKS=1 HEXAGON_WEB_SMOKE=1 npx tsx tooling/smoke-api.ts`.

Result: exit 0, verified, resource and template cleanup confirmed. Finished 2026-11-15 03:31:20 UTC. Private journal: `.local/evidence/api-smoke-8364f454-0251-4da4-a36d-80f7574c8b0f.json`.

The TypeScript task and the Python task each run actual OpenCode/MiniMax in a separate E2B cloud Sandbox. The Python client creates its own Agent, Session and initially uncredentialed report Tool connection, uploads the complete application fixture, submits idempotently and drives its own event/approval/result lifecycle. The parent does not supply a canned result or complete the Python task in its place.

## GUI authorization and continuation

Python Session: `9e17bbfe-7897-4846-a11e-f1181b7a7be6`. Original Run: `95a93746-88dd-4cb1-a4e6-d0485e9e7c78`. Report connection: `a0e65304-8590-4fda-884c-046288256e28`.

On authorization.required, Python confirms no new report write, emits a checkpoint containing IDs only and waits. Its GUI mode does not update credentials itself. The parent creates an encrypted checkpoint and only observes connection readiness until the browser completes registration. Python then independently reads the connection through its SDK and checks ready/enabled before resuming stream consumption.

Ego-browser TaskSpace 11 performed the following actual Console interactions:

- The Python Web report row initially displayed draft, disabled and no credential.
- Its configuration dialog exposed a password input. The test credential was supplied in memory from the encrypted checkpoint and saved through the form.
- The row then displayed a masked saved credential, still draft and disabled.
- Clicking Validate displayed success and ready, still disabled.
- Clicking Enable displayed ready/enabled. The original Python Run continued; no task resubmission was needed.
- The browser task was finished and closed after observing enablement.

The Python SDK subsequently answered approval, including an identical repeated approval submission. Relative to its task baseline, the real report service recorded zero writes before approval and exactly one afterward.

## Full Python task evidence

- Same idempotent submission returns the same Run.
- SSE disconnect/reconnect from the first event preserves all 815 event IDs, exactly matching paginated persisted history without duplicates or missing events.
- Actual application implementation completes; the immutable fixed test is independently read and executed by the parent, reporting 8 assertions passed.
- Final assistant output is nonempty and completed. Report/code artifacts are downloaded, hashed and checked against the test output.
- Authenticated preview serves cloud application content; anonymous access is denied.
- Follow-up uses the same Python Session. Python also continues the TS Session, and TypeScript continues the Python Session.
- Explicit cancellation reaches cancelled. Preview revocation denies access; a newly created preview is denied after Session close.
- Artifact bytes and final output remain available after close. Python deletes its now-unreferenced report connection.
- Provider inspection confirms both task Sandboxes gone, and the owned temporary template is deleted.

Validation: `npm run check` and Python AST parsing passed. Full PostgreSQL-backed regression: 18 files / 42 tests passed.

Scope: independent Python task with GUI runtime authorization and the complete SDK task lifecycle. Shared Sandbox/model/requirements initialization is API-driven in this run; those common Console onboarding forms have separate real evidence in [GUI initialization](2026-11-15-gui-initialization.md). Preview interaction in a browser is also covered separately; Python checks its own preview over HTTP. This does not complete the remaining provider, connection GUI CRUD, fault or permission matrix.
