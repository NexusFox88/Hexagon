# Application write outcome correction

The source journey requires unknown external outcomes to stay explicit and prohibits blind duplicate execution. Code inspection found Linear HTTP 200 GraphQL errors were converted to `AppRequestError`, which the broker persists as a completed error result. GraphQL errors can coexist with already executed mutation effects.

Application dispatch now passes the operation's declared write flag into response interpretation. Linear mutation errors use the existing unknown-outcome path. Read/verification errors still fail normally. Callers that omit the context default conservatively to write semantics. Connection validation and OAuth identity verification explicitly use read semantics. Raw provider error messages are not returned or persisted by this change.

Verification:

- `npm run check`: passed.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npx vitest run integrations/apps/registry.test.ts modules/tools/applications.test.ts modules/apps/oauth.test.ts modules/tools/broker.test.ts modules/tools/cancellation.test.ts`: 5 files / 13 tests passed.
- Adapter regression covers mutation errors with both partial successful data and null data; reads and account verification remain ordinary errors.
- Database broker regression now covers both Todoist and Linear: zero writes before approval, one successful write with deduplicated result, a second uncertain write, and no re-dispatch after constructing a new broker. The Linear response deliberately includes a successful created-issue payload together with resolver errors.
- Provider transport is mocked; no real account, message, issue or SaaS operation was used. This is not a claim of live Linear acceptance, which remains waived for the connector expansion.

References: https://graphql.org/learn/response/ and https://linear.app/developers/graphql .
