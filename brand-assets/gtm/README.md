# Hexagon GTM studio

**Your agent fleet. / Your infrastructure stack.**

A production kit for X / Twitter, Medium, Reddit, GitHub, YouTube and technical media. All copy is English. The collection is designed around the existing modular H, Funnel Display / IBM Plex Mono / Geist typography, website-derived ordered dithering and original ASCII fleet artwork. See [Website reuse](WEBSITE-REUSE.md) for exact source mapping.

## Open the workbench

Open [index.html](index.html) locally. It provides searchable, keyboard-accessible filters and direct SVG / PNG downloads; it is a local asset workbench, not a marketing website.

For browser review over HTTP, run from the repository root:

```sh
python3 -m http.server 49763 --bind 127.0.0.1 --directory brand-assets
```

Then open `http://127.0.0.1:49763/gtm/`. Stop the server after use.

## Delivered collection

| Family | Deliverables | Entry point |
| --- | --- | --- |
| Concepts | Eight topics; light/dark transparent SVG components; wide, square and portrait SVG/PNG compositions | [Concept contact sheet](previews/concepts.png) |
| Campaign templates | Six parameterized families; five aspect ratios; light/dark SVG and PNG | [Template content](templates/content.json) · [Schema](templates/schema.json) |
| Carousel | Five ordered slides, light/dark, 1080 x 1350 | [Dark sequence](previews/carousel.png) |
| Product stories | Seven topics with source captures, full-frame and declared-detail SVG/PNG plates, captions and limits | [Provenance](product/provenance.json) · [Product sheet](previews/product.png) |
| Website visual system | Twelve six-chapter story plates, four transparent ASCII/dither layers and source provenance | [Website reuse](WEBSITE-REUSE.md) |
| ASCII flyby | Light/dark animated SVG and posters; MP4 exports stay local | [Dark poster](motion/flyby-dark-poster.png) |
| Motion | Four-second light/dark animated SVG and static posters; MP4 exports stay local | [Motion guide](motion/README.md) |
| Actual UI walkthrough | Sampled live-browser recording of tool usage, Session and initialization inspection | Local-only MP4; see [recording notes](product/README.md) |
| Agent operations | Creation guide, channel map, factual claim boundaries and machine-readable index | [Agent guide](AGENT-GUIDE.md) · [Asset index](asset-index.json) · [Channel map](CHANNELS.md) · [Claims](claims.json) |

Template families: launch, feature, code, explainer, carousel cover and product/release notes. Canvases: 1280 x 640, 1280 x 720, 1080 x 1080, 1080 x 1350 and 1080 x 1920. These are production presets, not a guarantee of any platform's current upload rules.

The `release` family uses preview-feature copy. It does not announce a new shipped version. The shortened code card assumes imports, configuration and an existing Session. A returned Run is not necessarily a completed result.

## Build and export

From the repository root, with Python 3, Node.js and ffmpeg installed:

```sh
python3 -m venv .local/gtm-venv
.local/gtm-venv/bin/pip install -r brand-assets/gtm/tooling/requirements.txt
npm ci --prefix brand-assets/gtm/tooling
.local/gtm-venv/bin/python brand-assets/gtm/tooling/build.py
npm run render --prefix brand-assets/gtm/tooling
npm run check --prefix brand-assets/gtm/tooling
npx vitest run testing/source-language.test.ts
```

The Python renderer uses the repository Geist font and the licensed Funnel Display / IBM Plex Mono font snapshots under `fonts/` and emits outlined typography. SVG files embed screenshot bytes where needed, so product plates do not depend on a remote asset host. The Node renderer exports PNGs, contact sheets and the local gallery. Node dependencies and lockfile are isolated under `tooling/`; this does not add a product runtime dependency. Font attribution remains in the parent `FONT-LICENSE.txt`.

Edit `templates/content.json`, then rebuild. Copy length and concept selection are constrained. `../brand-copy.json` remains the canonical brand-headline source. Product screenshots and source evidence must not be rewritten by the generator.

The generated asset index records dimensions, theme, topics, kind, source, export, alt text and claim boundaries. Raw product provenance is separate so a creative illustration cannot silently become execution evidence. Paths in the main index are relative to this directory except `capture`, which is explicitly relative to the parent brand directory.

## Actual review and limits

See [QA.md](QA.md) for the completed review and its scope. Captures show retained test Sessions and actual Console surfaces. No cloud task was created for this marketing work. The recording demonstrates UI inspection, not a new end-to-end provider acceptance run. The raw screenshots are dark-mode captures; a light marketing frame does not imply a light-mode product capture.

Shared masters remain in this product repository. Website changes belong only in `NexusFox88/Haxegon-Website`. This task does not commit, publish, deploy or send promotional material.

The website-derived revision contains 164 static SVGs and 144 PNG exports. Run `python3 brand-assets/gtm/tooling/website-motion.py` followed by `node brand-assets/gtm/tooling/render-website-motion.mjs` to rebuild the ASCII flyby, then rerun the main renderer to refresh the asset index.

## Local-only video policy

MP4 files are excluded from Git and the public asset index. Keep video exports on the local machine; do not force-add or upload them. SVG animation and PNG posters remain in the shared asset pack. Video encoding commands are optional local export steps. The sampled Console walkthrough is local-only and is not distributed in this repository.
