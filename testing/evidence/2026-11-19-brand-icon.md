# Console brand icon — 2026-11-19

Replaced the upper-left cube SVG with the exact light/dark icon SVGs from brand-assets. The 28px square preserves aspect ratio, existing wordmark, link target and localized Local badge. The resolved Console theme selects the appropriate asset, including manual theme selection. First-party assets use /console/brand/ to avoid third-party icon background/filter rules.

Validation: console-theme and console-i18n suites passed, 2 files / 7 tests. Browser static-shell inspection loaded both SVGs at native width 128; screenshots of light and dark variants were visually inspected. This was isolated visual validation, not a backend journey. Temporary preview stopped afterward.

The existing service on 8787 serves an immutable Console snapshot and has not been restarted by this visual-only task. Changes take effect on its next restart. No standalone marketing-site source was found; the implemented target is apps/console/index.html.

Follow-up: confirmed active_runs=false and execution.busy=false, then ran `npm run local -- restart` successfully. Opened the actual http://127.0.0.1:8787/console/#models page and visually inspected its screenshot. Both brand assets loaded; dark theme displayed the supplied white H icon and hid the light variant. The live service now serves the updated snapshot.
