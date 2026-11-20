# Website visual language, made portable

The original GTM set reused the logo and monochrome palette but missed the website's distinctive ASCII, dither, typography and narrative. This revision makes those features reusable in shared brand masters.

## Source of truth

Source repository: `NexusFox88/Haxegon-Website`, inspected at commit `868454e42fc221c228777400b76a3708eecc0288`. The working tree was clean when inspected. The website repository was read and rendered, not modified or deployed. This directory contains portable brand artwork, not a copy of the website application.

| Website implementation | Reused visual behavior | Portable implementation |
| --- | --- | --- |
| `hero.js`, `craft` and `drawCraft` | Original character-built execution unit, asymmetric flight angle and size/depth variation | `tooling/website_visual.py`, `components/ascii-unit-*.svg` |
| `hero.js`, `paintAtmosphere` | 4 x 4 Bayer threshold matrix, curved diagonal horizon, protected copy area | `tooling/website_visual.py`, `components/dither-horizon-*.svg` |
| `hero.js`, `drawFlyby` | Character streaks, foreground/background units, monochrome flight | `motion/flyby-*.svg`, MP4 and poster; motion is adapted to a four-second loop |
| `style.css` font faces and tokens | Funnel Display headlines, Plex Mono annotations, Geist utility text; near-black and paper-white | Licensed `fonts/` snapshots and outlined SVG glyphs |
| `journey.css`, `.journey-steps` | Six indexed chapters with a single active chapter | Campaign launch rail and `website/sequence-00` through `sequence-05` |
| `journey.css`, `.mission-world` | Product / control plane / Sandbox / tools / return paths | Six-chapter light/dark editorial sequence |
| `style.css`, `.section-kicker` and `.topology` | Bracketed editorial labels, quiet diagram textures and routing hierarchy | Shared campaign furniture and story plates |

The geometry is translated into deterministic vector output. It is not a browser screenshot of the website. Texture pixel pitch is adapted for static social graphics; the desktop website uses a denser animated canvas. Source file hashes are recorded in `website-sources.json` for future comparison.

## Composition contract

- Keep the official H unchanged. ASCII execution units are supporting illustrations, never replacement logo masters.
- Headlines use Funnel Display at regular weight. Labels and code use IBM Plex Mono. Utility copy uses Geist. Avoid mechanically applying bold Geist to the entire campaign.
- Use the dither horizon for campaign heroes, cover art and motion. Technical diagrams use a much weaker texture. Never overlay the texture on the captured product pixels.
- Preserve a clear copy zone. Depth comes from character scale, opacity and tilt, not neon glow or rainbow gradients.
- Use chapter rails to explain a process or unify a series. Do not add inactive-looking controls to a single product screenshot.
- Every process illustration is marked as illustrative. Three pictured Sandboxes do not assert automatic multi-agent planning or universal compatibility; the application determines fan-out and exact compatible combinations.
- The website currently has additional campaign headlines. This collection retains the requested canonical brand headline: `Your agent fleet.` / `Your infrastructure stack.`
- Third-party provider logos are not required to explain the lifecycle. These diagrams use generic boundaries so a conceptual diagram cannot imply an unverified named-provider combination.

## Adaptation, not decoration

The six existing template families now share the website typography and editorial labels. Launch artwork uses the ASCII fleet and dither atmosphere. Technical templates retain clear routing/code layouts. Actual Console screenshots retain their captured pixels and provenance.

The website's scroll choreography becomes a six-slide sequence: Fleet, Request, Dispatch, Harness, Tools, Return. The flyby becomes a short branded loop with a reduced-motion SVG and static fallback. Do not transplant scroll-dependent page scripts into static social artwork.

## Fonts

Font binaries were copied byte-for-byte from the website's public assets. Their OFL notices are included in `fonts/`. Outlined output is portable and does not fetch a font at viewing time. Keep font licenses with the source kit. Geist attribution remains in the parent brand directory.
