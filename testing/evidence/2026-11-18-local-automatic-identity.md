# Local automatic identity — 2026-11-18

Local Console bootstraps a process-local identity from a same-origin, loopback-only endpoint. It does not display or copy the disk owner credential. Python `Hexagon.local()` and TypeScript `await Hexagon.local()` discover private local workspace files; explicit remote clients retain explicit authentication. Generated Console examples pin the selected workspace and omit manual Token setup. Both clients also discovered the home pointer from outside the repository.

## Real cloud journey

GUI-generated programs were executed with HEXAGON_API_TOKEN, HEXAGON_BOOTSTRAP_TOKEN and HEXAGON_API_URL removed. Both used Vercel cloud Sandbox, Pi 1.5.2 and SiliconFlow international.

- Python Session `0e43073b-e44e-4a59-aa2d-16e3831f9d19`, Run `af254523-03c7-4333-805f-5b9b144274d2`: completed with LOCAL_PYTHON_NO_TOKEN_OK; Session closed.
- TypeScript Session `3b23b4a1-6711-4ea5-9ece-6b1e15a8faeb`, Run `9e1cfd15-b42e-4313-8b9d-30a7cc87d51d`: completed with LOCAL_TYPESCRIPT_NO_TOKEN_OK; Session closed.

Python initially reported an unconfirmed deletion; the same close operation was reconciled, and cleanup completed. TypeScript first encountered a failed preflight while another Run was active, before Session creation. A transient ingress health failure now receives bounded health rechecks before recovery decisions. The later real execution succeeded. These failures are not omitted from the acceptance result.

Private resource IDs, operation states, generated programs and screenshots are retained in `.local/local-auth-journey/`. Credentials are not reproduced here. This is a fresh dual-SDK journey on Vercel, not a rerun of every supported provider.

## Commands actually completed

- `npm run verify`: 66 test files, 193 tests passed (00:30:53, 28.53s).
- `npm run verify:packages`: 3 test files / 3 tests passed against built/installed SDK packages.
- `npm run verify:startup`: startup/restart and hosted fixture completed; private startup evidence retained under `.local/startup/hexagon_startup_4d8dfbdf9c4a4c3888800a68941e14da/`.
- After final presentation changes: `npm test -- testing/console-i18n.test.ts testing/console-release.test.ts`: 2 files / 5 tests passed.

Deterministic security coverage includes missing/cross-origin headers, forged host, remote peer, wrong port, anonymous protected calls, hosted endpoint absence, private file permissions, endpoint mismatch and redirects. Local access trusts the current OS user; it is not an authentication mechanism for remote deployment.
