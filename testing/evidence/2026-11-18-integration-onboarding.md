# LLM and Tool connection onboarding

Unified with the Sandbox editor: provider identity/icon, required credentials and endpoint fields first, default connection name, optional saved credential disclosure, collapsed advanced configuration/details, fixed footer and independently scrolling form. No native select/dialog/validation UI. All new copy is in en and zh-CN catalogs.

API-key integrations now save, validate, then enable through the same retained-identity flow. Validation failure cannot enable a connection; retries update the saved identity. OAuth hides API-key inputs, saves client setup through the main action, starts authorization, polls its result, and retries status reads after transient failures. Public MCP hides credentials; first action saves and discovers tools, then the user reviews allowed tools and verifies/enables. Permission disclosures show selected/total counts and open when none are selected. Removed stale save-before-authorize instructions.

## Actual browser review

Ego-browser TaskSpace 35, page p1 against the local service. Opened all 37 Tool catalog forms in both Chinese and English. The footer remained in the viewport for every form; Chinese sweep also checked horizontal overflow and required field visibility. Reviewed OpenAI Responses, OpenAI Chat Completions, and Anthropic model forms: credential, URL, model ID, name are visible with fixed footer. Empty model submit shows a localized required field error. OAuth missing client setup displays `Enter the OAuth client ID and secret.` and scrolls the body to the error; generic API-key input is hidden in OAuth mode. Public MCP hides both credentials and saved-secret choice. Reviewed Lark multi-credential form and GitHub OAuth at 390×844; footer visible, no panel horizontal overflow. Actual screenshots inspected. Lark keyboard focus starts at App ID, Tab moves to App Secret; Escape closes the editor. Catalog entries were opened through clicks, not direct handler invocation.

Artifacts: `.local/integration-editor-review/` (catalog-sweep.json, catalog-en.json, model.png, oauth.png, exa.png, lark-en.png, lark-mobile.png, oauth-mobile.png, lark-zh-final.png).

## Real external attempt and limitations

Created a temporary public MCP connection through the GUI to the endpoint already configured locally, https://mcp.deepwiki.com/mcp. Discovery failed with the application's MCP connectivity error; retry retained exactly one draft connection. This is NOT a passed real-provider acceptance. Private record including its resource ID is `.local/integration-editor-review/mcp-result.json`. Deleted the temporary connection after review; existing connections unchanged. No new SaaS account authorization, model inference, or cloud Sandbox execution was performed in this UI-focused pass. Success/enable/error transitions are deterministic tests, distinct from live provider results.

## Commands

- `npm run check`: passed.
- `npx vitest run testing/sandbox-connect.test.ts`: 4 tests passed, including generic model/tool error and enable failure identity retention.
- `TEST_DATABASE_URL=postgres://hexagon@127.0.0.1:55432/hexagon npm run verify`: 83 files / 248 tests passed, 32.11s. Log `.local/integration-editor-review/verify-final.log`.
- Local service restarted with final assets. Temporary review connection deleted. Automatic ingress stopped after review; API and worker kept running.
