# Tool verification identity and scope

The final source audit found that main-journey step 3 explicitly requires the GUI to show the verified target account and resource scope. Previously the HTTP JSON adapter discarded the verification response, and Console showed only ready/enabled. Earlier successful task evidence did not prove this display requirement.

The adapter now extracts only optional account/scope metadata from a successful JSON verification endpoint. It reads at most 16 KiB, bounds account to 200 characters and scope to 50 entries of at most 100 characters, rejects controls and metadata echoing the supplied credential, and ignores all other response fields. Authentication-only/204/non-JSON endpoints remain compatible; absence of metadata is displayed explicitly instead of inventing an account or scope. Stored validation remains tied to the connection version; existing configuration/credential rotation clears it.

Console renders this metadata as text, with masked credentials, ready state, enabled state and verified operations remaining separate. Sandbox validation operations are also shown. The displayed scope describes the verification endpoint's assertion; it does not replace Tool operation/approval policy or prove permissions beyond the recorded verification.

Actual browser acceptance in the existing Ego task 15:

- Created a temporary HTTP JSON Tool connection through the GUI, using the already running local requirement service and private test credential.
- Saved, then explicitly validated. Observed account `local-manual-journey`, scope `requirements:read` and `reports:write`, and verified operation `凭证验证接口`.
- The connection remained disabled until explicit enablement; its credential was displayed masked.
- Deleted the temporary connection through the GUI and confirmed the original empty connection list. Console was retained for the user's manual journey.

Read-only real service checks also returned auth 200 with that account/scope and requirements 200 with ACCEPTANCE-001. An initial anonymous request returned 401 as expected.

Validation: TypeScript check and Console syntax check passed. Full PostgreSQL suite passed **37 files / 103 tests**, including three new metadata tests covering exact field allowlisting, credential/control filtering, oversized bodies and 204 compatibility. The local control plane was reloaded as PID 24200 with API/database/credential/worker health ready. No cloud resource or external report was created by this display acceptance.
