# Public identity cleanup — 2026-11-21

Scope: current publishable file contents in the product and documentation repositories. Historical Git objects, author metadata, local private evidence, installed dependencies and the operating-system account are outside this content cleanup. No history rewriting or force push was performed.

Changes: replace personal filesystem paths with portable paths; replace workspace account labels with neutral labels; preserve acceptance requirements and historical test outcomes. Browser-review scripts accept HEXAGON_REPOSITORY_ROOT or the current working directory. Add a case-insensitive identity scan and a GitHub Actions push/pull-request gate in both repositories.

Actual verification:
- Product clean publishing checkout: `npm test -- testing/source-language.test.ts` passed (1 file, 1 test).
- `node --check tooling/console-browser-review.mjs` and `node --check tooling/console-journey-review.mjs` passed.
- `python3 tooling/check-public-identity.py` passed in both publishing checkouts. A temporary uppercase forbidden-identity fixture was rejected with exit 1 in each checkout, then removed; clean scans passed again.
- `git diff --check` passed in both checkouts.
- Both modified documentation JSON evidence files parsed successfully with `python3 -m json.tool`.
- Documentation publication: f1384dbe5b4f17dab49fa41764964606ab34b102; public identity workflow passed: https://github.com/NexusFox88/hexagon-docs/actions/runs/44896287912.
- Documentation changes are excluded resource/maintenance files, plus the new CI gate; no rendered MDX, navigation or style changed. Per PUBLISHING.md, a Mintlify rebuild is not required for excluded files.

Earlier attempts: an unrestricted local Vitest path filter also selected a nested GTM checkout and failed there; the intended local test passed when excluding GTM. The clean publishing checkout initially lacked dependencies; reusing installed dependencies allowed its exact source-language test to pass. Mint instructions was unsupported by the installed CLI, and the latest CLI fetch was blocked by sandbox networking; the canonical publishing instructions establish that this resource-only cleanup needs no site rebuild. No fresh browser, model or cloud Sandbox acceptance is claimed.
