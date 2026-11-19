# Console body redesign and complete journey — 2026-11-18

The user's acceptance is the five-step journey in acceptance.md, with consistent design across every Console page and dialog. The later feedback specifically rejected card/paragraph assembly in the body, not just the screenshots. The navigation stays stable; body changes are shared across the application.

## Surfaces actually reviewed

17 routes in both English and Simplified Chinese: Sessions, Sandbox, LLM, Tools, API example, Settings, Tokens, Network, Secrets, Protected APIs, Harnesses, Agents, Resource operations, Overview, Runs, Pending, Fleet. Desktop browser navigation/rendering and a real 390px emulated viewport were checked. Both-language narrow records show no document-level horizontal overflow; rich tables scroll inside their own surface. Full snapshots, screenshots and machine-readable observations are retained privately in `.local/console-complete-review/`.

| Surface | Finding and implementation | Actual interaction |
| --- | --- | --- |
| Lists | Repeated explanatory sections/statistics displaced the data. Removed them; one heading/action bar and compact table/rows. | Navigation, filtering surfaces, connection detail actions; both languages. |
| Sessions | One-Run report tabs were not a conversation. Replaced with chronological right-aligned user bubbles and left-aligned replies, inline collapsed execution detail, safe Markdown. | Two real turns viewed together; tool-result reply and artifact download reviewed. |
| API example | Separate cards and repeated instructions; language selection buried below the prompt. Unified configuration/code workspace and keyboard-operated Python/TypeScript tabs. | GUI-generated Python/TS programs executed; final tabs checked with click and arrow keys and generated command changes. |
| Connection editors | Capability text and permission checklists pushed credentials below the fold. Collapsed optional explanations/permissions, compressed field spacing, removed redundant search for one-option kinds. | 86 localized form reviews: 11 Sandbox variants plus model, HTTP, Secret, and 29 Tool catalog entries per language. No external authorization claimed for every SaaS. |
| Catalog / OAuth | Shared focus/dismissal and configuration sequence. | Search, keyboard single selection, locked chosen provider, OAuth field switch, Escape and focus restoration. No real OAuth grant attempted. |
| Secrets / confirmation | Application-owned validation and destructive action consistency. | Empty submission marked/focused required field. Disposable Secret created; delete cancelled, then confirmed; record removed. |
| Tokens | Large creation card and local copy incorrectly encouraged manual token setup. Creation collapsed; local instructions corrected; rows standardized. | Disposable application token created, one-time value dismissed without recording it, then revoked. Cancel focused in confirmation. |
| Harness / Agents / Network | Secondary views used unrelated large panels. Shared form/list scale, flat Harness rows, expandable registration, aligned configuration columns. | Browser review of these views and inline forms; no unrelated provider settings changed. |
| Operations / Pending / Fleet | Resource cards and list-plus-detail duplicated context. Compact expandable operation rows; Fleet detail replaces list. | Existing operational states reviewed. No claim of fresh destructive fault injection. |

The raw API resource IDs and user text remain unchanged. Some historical account records contain test-style names/prompts; they are not replaced with fabricated design data.

## Fresh blank-workspace journey

A separate control plane on ports 8857–8859 and isolated PostgreSQL schema/data directory was created. The normal workspace was preserved. No manual control-plane token was entered.

1. Empty Sessions page directed to Sandbox and model setup.
2. GUI created Vercel `Review Sandbox` and SiliconFlow international `Review Model`, verified and enabled both.
3. Downloaded the generated Python program and ran it without API token environment variables. Session `74b189af-0732-4e17-ab30-58f9989ff925`, first Run `d67fb4ad-b275-4db9-b399-3567afa894a9`, returned `JOURNEY_PYTHON_OK`.
4. A second Python turn in the same Session returned `MULTITURN_OK` and correctly recalled the previous cloud-Sandbox statement. Both turns were inspected in the conversation UI.
5. GUI selected Exa in the catalog, configured its credential, verified and enabled `Review Search`.
6. Selected this Tool in the API example, downloaded and ran TypeScript. Session `e805aa47-53a4-40a8-939c-00a2fa91340f`, Run `400abbb2-5a08-491c-82d8-349a8308c739`, completed an actual `search` call and returned `JOURNEY_TYPESCRIPT_TOOL_OK` plus the documentation URL and artifact.
7. Both cloud Sessions closed; retained create and delete operations are completed. SDK close was rechecked idempotently. Provider deadlines had already closed the workspaces by final review. The exported 32-byte URL artifact remained downloadable through Console after closure; its SHA-256 matched the retained artifact record.

Cloud resource IDs, output, Tool calls and cleanup operations remain in private `blank/cloud-evidence.json` and `blank/cleanup.json`. This is real Vercel/Pi/SiliconFlow/Exa acceptance, not a rerun of the whole provider matrix. Other SaaS forms were reviewed without granting accounts, following the user's earlier instruction.

## Commands and limitations

- `TEST_DATABASE_URL=… npm run verify`: **67 files / 195 tests passed**, 00:57:04, 27.42 seconds.
- After final language-tab/copy changes, focused UI/i18n/Markdown/release checks: **4 files / 8 tests passed**.
- Marked renderer tests cover formatting, HTML escaping, active URL rejection and no remote image loading.
- A release test initially exposed unsupported test-runtime `import.meta.resolve`; changed to `createRequire().resolve`. Startup also exposed the dependency license filename, corrected to `LICENSE`. Subsequent full verification and both service startups passed.
- Initial high-level browser screenshot calls reset emulation. Narrow acceptance therefore used raw CDP metrics/evaluation/capture and recorded actual `innerWidth:390`; an attempted embedded-frame review was blocked by the product CSP and is not counted as evidence.
- No git commits or publishing. Actual cloud execution, deterministic tests, and visual/form review are separate evidence categories.

The isolated review control plane and its development ingress were stopped successfully after cleanup. The normal Console remains on port 8787; the browser was left on the original reported Session in Simplified Chinese.
