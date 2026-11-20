# GTM asset review

Reviewed November 20, 2026. This record covers brand assets, not product behavior or fresh cloud acceptance.

## Completed

- Generated 148 static outlined SVGs: 16 transparent components, 48 concept cards, 60 template outputs, ten carousel slides and 14 product plates.
- Rendered all 132 opaque PNG exports with resvg. Dimension checks passed for every indexed PNG. All SVGs parsed as XML; no rasterized text substitution was used for creative typography.
- Reviewed the eight concept themes in both palettes, the five-slide carousel, representative full-resolution template outputs and product imagery. Fixed the horizontal code layout, release layout and detail-crop clipping after rendering.
- Local browser gallery: all 132 images loaded, zero broken images; filtering and search operated correctly; searching the code headline returned ten template variants; keyboard Enter activated Product and showed 14 plates; the empty-search state displayed an explanatory message.
- Desktop gallery had no document horizontal overflow. At 390px, document width equaled viewport width. Screenshots were inspected.
- Animated SVG: 14 satellite animations were present normally; all 14 were hidden with reduced-motion preference, leaving the static H. MP4 cannot honor that preference; posters are supplied.
- Both motion videos were exported as 1280 x 720 / 24 fps / four seconds. The sampled actual-UI walkthrough was exported as 1280 x 720 / 24 fps / 10.708 seconds. Recording frames were reviewed as a contact sheet; source cadence and loading states are documented.
- Product source captures and metadata were reviewed for visible secrets and unsupported implications. No synthetic success status or adoption metrics were added.
- Scoped English-only scan across GTM sources and documentation passed. Claim-source links and product-provenance links passed the asset check.

## Commands

- `python3 brand-assets/gtm/tooling/build.py` — passed.
- `npm run render --prefix brand-assets/gtm/tooling` — passed.
- `npm run check --prefix brand-assets/gtm/tooling` — passed.
- `python3 brand-assets/gtm/tooling/motion.py` and `node brand-assets/gtm/tooling/render-motion.mjs` — passed after correcting the repository-root path in the motion renderer.
- ffmpeg encoding and ffprobe dimension/duration inspection — passed.
- `git diff --check -- brand-assets` — passed.
- `npx vitest run testing/source-language.test.ts` — failed with 95 entries outside this task's changes: `docs/product/coverage.json`, documentation generators/link checker and `tooling/sdk-reference-map.json`. No `brand-assets/gtm` entry appeared. Those concurrently modified files were left untouched. The repository-wide check is not reported as passed.

## Limits

Channel sizes are chosen production presets, not validated upload-limit documentation. No platform post or public deployment was made. Gallery review is local, not a test of X, Medium, Reddit or YouTube compression. Historical screenshots do not establish fresh cloud availability, universal pause/recovery or complete OAuth/write-approval coverage. Exact interactive flow recordings for each of those scenarios are not part of the footage supplied here.

## Website reuse revision — November 20, 2026

- Inspected the standalone website at commit `868454e42fc221c228777400b76a3708eecc0288`, including actual browser hero/mission views and `hero.js`, `style.css`, `journey.css`. Website working tree stayed clean.
- Reused the website character-generation algorithm and Bayer matrix; adapted them into deterministic vector layers with original source hashes in `website-sources.json`.
- Copied the original Funnel Display and IBM Plex Mono fonts with their OFL notices. Updated campaign typography and outlined all distributed text.
- Rebuilt 164 static SVGs and 144 PNG exports. Reviewed dark/light launch compositions, long-form code layout, the chapter sequence and the flyby poster. Fixed chapter-rail overlap, one product-node heading width and the oversized vertical code frame.
- Added twelve website-story plates and four transparent supporting components. Added two four-second ASCII flyby loops with SVG, MP4 and posters. Rebuilt the existing formation motion with the current typography/palette.
- Browser gallery reported 144 images and zero broken images. Desktop reported no horizontal document overflow. Keyboard Enter activated Website story and showed exactly twelve plates. The narrow browser view wrapped controls and was visually inspected; effective `innerWidth` was 433 CSS pixels and document width was 416 (requested emulation width was 390, affected by browser scaling).
- Animated flyby SVG reported two active animations normally and `animation-name: none` for both groups under reduced motion. ffprobe confirmed dark flyby at 1280 x 720, 24 fps, four seconds. Source frames are 12 unique poses per second.
- `npm run check --prefix brand-assets/gtm/tooling` passed for 164 SVGs / 144 PNGs. Scoped English scan and XML parsing passed. `git diff --check -- brand-assets` passed.
- Re-ran `npx vitest run testing/source-language.test.ts`: still failed with 95 entries in the separately modified documentation/configuration/tooling files, with no GTM entry. The full repository test remains failed; unrelated files were not repaired as part of artwork production.
- No website code, Console behavior, raw product capture, cloud resource or public deployment was changed. No commit or push was made.
