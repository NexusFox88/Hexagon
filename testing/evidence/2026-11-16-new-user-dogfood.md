# New-user dogfood: blank configuration to SDK result and cleanup

Date: 2026-11-16 (Asia/Shanghai). Trigger: user explicitly requested a complete new-user journey rather than page/test coverage. Existing configurations were not reused. A fresh PostgreSQL schema and private data directory were created, on ports 8837/8838/8839. Only previously authorized provider credentials were supplied as user inputs; all connections, Agent and application token were created through the GUI.

## Observed journey

1. Started a fresh managed local service, opened its Console and used its newly generated owner token. The launch output did not say where to find the token file or which JSON field to copy; corrected the startup output and login guidance.
2. Followed Start here, added a Vercel Sandbox connection through its GUI, saved, verified and explicitly enabled it.
3. The connection page incorrectly offered Create Agent and described the single connection as ready to call, despite no model existing. Following it led to an empty model selector with no repair link. Replaced the misleading handoff with live prerequisite guidance and added missing-connection links in the Agent editor.
4. Added SiliconFlow's compatible model endpoint through the GUI, verified and enabled it. Selected the connection's Create Agent action. The only available Sandbox and model now populate the draft automatically. Added plain-language execution-engine guidance and compatible Pi default for standard new drafts. Optional tool bindings are collapsed. Save checks preflight before creating the Agent.
5. Saved `My first agent`; the GUI opened that Agent's calling page. Created `My first app` application token. Found the missing return path and ambiguous relationship between token types; added explicit Agent/Session return context and token setup instructions.
6. Found that the code block combined install, first run, resume, new turn and close. Running the entire block would have submitted another task and closed the workspace. Split the first invocation from independently chosen later commands, and explicitly identified the checkout working directory and environment-variable setup.
7. Downloaded the actual Python program through the GUI. Installed the Python SDK using a new `.venv` and the shown local-source install command. Ran the unedited downloaded program against a real Vercel/Pi Sandbox and SiliconFlow. It wrote `/tmp/hexagon-new-user.txt`, read it back with the harness tool and returned `FIRST_JOURNEY_OK`. Exit code 0.
8. Returned to Tasks & results. The list showed mostly UUIDs and did not update during provisioning. Added bounded task-text previews and pinned Agent names to the tenant-scoped query, text/name search, execution progress refresh, and separate input/answer/resource sections. Technical identifiers remain available in a disclosure.
9. Used the result page's Continue this session action. Session ID was carried to the calling form. Downloaded the actual TypeScript program, installed the local TypeScript SDK and sent a new turn reading the file from the prior Python turn. It returned `FIRST_JOURNEY_OK`, exit code 0. The same Session contains two distinct completed Runs.
10. The continuation page initially suggested the plain run command, which would only observe the previous journal entry. Corrected it to `--new-turn`. Added explicit Agent/Session journal identity checks to generated Python, TypeScript and HTTP examples so a different selected resource cannot silently reuse an unrelated local journal. Original stable-key recovery and disconnect semantics remain.
11. Followed the application-token link from continuation, then its return link: the same Session remained selected and the first command included `--new-turn`. Also verified return to the saved Agent from its token link.
12. Ended the conversation using the result page's application-owned confirmation. The GUI reported workspace closed while the answer remained readable. Independent provider inspection confirmed the resource absent.
13. Replayed the incomplete-configuration branch: disabled the test model via GUI; created an unsaved Agent draft; followed its missing-model link; the connection handoff enabled the existing verified connection instead of creating another. Returning retained the draft name, the original connection IDs and compatible Pi selection. No extra Agent was saved for this branch.

## Evidence

Private directory `.local/product-onboarding-journey/` retains launch/schema information, the actual downloaded programs, SDK logs, journal, both process exit records, `journey-evidence.json` and `teardown.json`. Initial setup began at 22:53:07. Timings include development and rechecks and are not a human onboarding benchmark.

- Python Run: `94377ae1-26b7-4e43-a02d-0722d60b7b34`, completed, `FIRST_JOURNEY_OK`.
- TypeScript Run: `6195b781-0796-46b8-ab56-b27a2e9cfd4c`, completed, `FIRST_JOURNEY_OK`.
- Shared Session: `0750ef89-0f75-4ccf-b1b4-01a1a7dcb7fb`, closed. Provider resource ID retained only in private evidence; independent `inspect` returned absent.
- Test token revoked via GUI; actual API request using it returned 401. Credential input copy and revoked raw token file removed after verification. Encrypted workspace data and private owner/encryption files remain for audit.
- Test service and its temporary ingress stopped. Primary 8787 service restarted with the changes, then its owned temporary ingress was stopped; primary Console remains available. No primary workspace connection/Agent was replaced.
- English calling/results and Chinese narrow result screenshots were visually inspected: `testing/evidence/new-user-journey/`.

## Supporting automated verification

The real journey above is the main evidence, not these tests:

- `npm run check`: passed.
- Targeted generated-client, query/preflight, tenant-boundary, localization and no-native-UI checks: 6 files / 10 tests passed. Query coverage checks task-text search and pinned Agent names; client tests check mismatched journals do not submit another Run.
- `npm ci` restored dependency installation after exercising local SDK installation.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 62 files / 184 tests passed, 23:04:52, duration 26.77 seconds. Log in private evidence.
- The first query-test extension exposed a test teardown foreign-key failure after adding a fixture Run; corrected teardown to remove events/Runs before Sessions and reran successfully. A browser script also initially assumed nested text matched a summary selector; corrected using observed elements. Neither is recorded as successful on its first attempt.

## Scope and remaining limits

This run validates the actual first-user core journey, cross-language continuation, recovery guidance and cloud cleanup. Optional third-party SaaS authorization, external-write approval and web-preview/artifact project acceptance are not re-certified by this task; their earlier full-journey evidence remains separate. The product does not claim an independent human usability study or that every possible provider failure has disappeared. The two pre-existing Instabox unknown creates are unchanged. No commit or publication.
