# Write, check, and translate documentation

Product content lives in docs/product/zh-CN and docs/product/en. Internal design decisions belong in engineering directories such as docs/plans; actual results belong in testing/evidence. Append-only engineering history is not a current tutorial.

## Start from a user question

Use the [content brief](../../../plans/2026-11-19-documentation-content-architecture.tmp.md) to confirm ID, path, audience, and responsibility. Each page has one primary purpose: fixed-task tutorial, goal-specific how-to, conceptual explanation, or exact reference.

Include a direct answer, when to use it, version/capability prerequisites, steps/definitions, success checks, important failure exits, sources, and at most three next steps. Follow the [glossary](../reference/glossary.md); do not translate API fields, method names, or state values.

## Make claims verifiable

Fields/defaults come from schema/implementation, capabilities from registries, and verified scope from dated SDK/protocol/scenario evidence. Examples identify dependencies, client initialization, inputs, results, and cleanup. Label excerpts and prerequisite variables. Placeholder domains/test objects are not ready-to-use public services.

Avoid independently maintained copies of field tables. Put runnable examples in examples and link/extract them. Generated tables identify sources/snapshot dates. Do not shrink the acceptance journey to match missing implementation; investigate conflicts explicitly.

## A complete small change

For an E2B template clarification:

1. Check integrations/sandboxes/e2b.ts and evidence: is the change a schema default, resource prerequisite, or new verification scope?
2. Edit both languages at integrations/sandboxes/e2b.md. Update overview/OCI references where affected, retaining historical dates.
3. Change actual example sources if parameters change, then run appropriate syntax/type checks. Explicitly state when cloud execution was not repeated.
4. Update the coverage.json entry with actual status/scope. Draft does not automatically become complete; file presence does not establish content quality.
5. Run structural checks and read both versions for equivalent sources, constraints, and next steps.

```sh
python3 tooling/check-product-docs.py --report testing/evidence/2026-11-19-product-docs-structure.json
```

This checks planned IDs, files, inline Markdown file targets, fence pairing, and index reachability only. External URLs, anchors, examples, and cloud behavior require separate verification. --require-complete checks ledger status but does not replace editorial review. Use a new dated evidence filename for later acceptance rather than overwriting unrelated history.

## Languages and UI

Use matching slugs and equivalent steps. Synchronize safety boundaries, error actions, parameters, and completion checks, not just titles. Clearly identify stale translations/version fallback; do not publish empty translations or label older content current.

Documentation translation differs from UI catalogs. UI changes must satisfy the [Console contract](../../../console-design.md): complete en/zh-CN catalogs, matching interpolation, accessible names, dynamic errors, Intl formatting, and browser review in both languages. Use actual UI screenshots without credentials/private resources.

## Publication review

Review task executability, failure recovery, cleanup, and evidence scope. Separate contract, simulation, real-cloud, and planned; planned is not passed. Public content excludes .local, Tokens, backups, and unsanitized user data.

This workflow does not claim the full content plan is already complete. Next: [proposals and contributions](proposals-and-prs.md), [reading evidence](../integrations/verified-combinations.md).
