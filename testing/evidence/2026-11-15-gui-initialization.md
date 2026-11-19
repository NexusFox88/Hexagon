# GUI initialization through real SDK completion

Date: 2026-11-15. Real E2B + OpenCode 1.2.27 + user MiniMax endpoint. Ego-browser TaskSpace 8 was closed at the end of GUI work.

Command:

```
HEXAGON_GUI_SETUP=1 HEXAGON_GUI_AUTH=1 HEXAGON_WEB_SMOKE=1 HEXAGON_BOTH_SDKS=1 npx tsx tooling/smoke-api.ts
```

Exit 0, verified. Private journal: `.local/evidence/api-smoke-843b93cb-4e9f-406b-b4a3-eef8ba8bd5b6.json`.

## Observed GUI steps

1. Signed into a fresh Console with zero connections.
2. Created E2B connection `31cd6200-4977-4bae-b3da-16b73a7fd787` in the form, entering the test template and account credential. Saving showed draft/unverified, disabled and a masked saved credential. Explicit verification succeeded; explicit enablement then showed enabled. Backend validation recorded `list_sandboxes`, not a claim about every account permission.
3. Created MiniMax model connection `4350a953-70d5-487f-ad1b-5036f1b9a8ec` through the model form. Verification performed the bounded real messages request; enablement succeeded.
4. Created Requirements Tool `f7984ccc-2667-429b-9d57-e2eeb5834a8e` through the Tool form, including operation schema, service URL and credential. Verified and enabled it. The subsequent real Agent read ACCEPTANCE-001 through this connection.
5. The SDK submitted a task using these GUI-created connections. Fleet showed the resource id and actual configured Harness. Detail showed three distinct values: Sandbox running, Runtime ready, Run waiting_authorization.
6. Used the Fleet “接入所需 Tool 凭证” action to open Reports configuration. Confirmed the credential control is a password input. Saved the credential, then verified and enabled Reports in connection management. The original Run resumed; its Fleet state changed back to running. No task resubmission was needed.
7. Created a preview from Fleet and opened the actual task application. Search `API` returned the two matching fixture tasks. Combining `API` with `done` returned only Launch API. A nonmatching query displayed zero results and the empty-state message.

Only selected state labels were retained as GUI evidence. Complete execution-log snapshots were not persisted. The first automation query incorrectly expected one API match before applying status; inspecting the actual fixture results corrected that assertion. The application correctly returned two.

## SDK and provider evidence

TypeScript Session `881285e1-4fad-4828-84b9-503e909b4805`, primary Run `58f5f2c3-3207-49ab-ba51-93c0e9d63769`: completed with actual artifacts, fixed tests independently reporting 8 assertions passed, 818 events with exact replay, GUI external authorization, API approval, follow-up and cancellation. Completed results/artifacts survived close.

Python independently ran the same Web task in Session `d0de08ca-c0e8-4d62-bac3-b1bb8c7324fe`: 8 assertions passed, 838 events, authorization and approval, zero report writes before approval and one afterward, preview validation, retained artifacts and close. Bidirectional cross-language continuation also completed. Python reused the GUI-created Sandbox/model/Requirements connections; its separate Reports credential was entered by the Python client, so this does not prove Python's own GUI authorization branch.

Product cleanup, provider resource cleanup and test-template cleanup all confirmed. Finished 02:50:48 UTC. No manual shutdown intervention was needed.

## Test tooling and remaining limits

`HEXAGON_GUI_SETUP=1` waits for real GUI-created ready/enabled connections instead of creating them via API. Checkpoint payloads containing credentials or API access are encrypted using the existing AES-GCM SecretStore. Evidence checkpoint files contain only tenant/schema/purpose/secret references. `read-gui-checkpoint.mjs` decrypts the scoped payload in memory for browser form entry and does not print it. Setup and authorization paths were exercised; the browser-review checkpoint was also migrated to this format but not separately exercised in this run. TypeScript check and helper syntax check passed.

Automatic approval rejected the initial plaintext handoff implementation and unrestricted full-page log capture. The run proceeded after removing those exposures; neither blocked action was bypassed.

This is fresh connection onboarding in an isolated test control plane. It does not prove README clean deployment, control-plane restart persistence, every provider GUI, Python's separate GUI authorization or the remaining fault/network/security branches.
