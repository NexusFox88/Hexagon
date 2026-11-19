# Hexagon visual identity

Version 1.1 · November 20, 2026 · English-only asset library

## Positioning and voice

**Hexagon — Self-managed Agent fleet control plane.**

Extended description: A self-managed Agent fleet control plane with a headless agent API. Bring your Sandbox, Harness and LLM.

Use the spelling **Hexagon**. The short lockup descriptor is **Agent fleet control plane**. Creative headline: **Your agents. Your infrastructure.** Brand verbs: **Isolate. Route. Orchestrate.** These are identity statements, not certifications of security, compatibility or service availability.

The character is precise, modular and restrained. Express DevOps through geometry, hierarchy and purposeful movement. All copy, documentation, accessible labels, source comments and metadata in this folder must remain English.

## Identity geometry

The modular H is the primary identifier. Its exterior uses 30-degree edges to suggest a hexagonal boundary. Independent side modules and a detached bridge convey separation and coordination.

Master viewBox: 128 × 128. Each vertical module is 28 units wide; the central bridge is 24 × 20; each internal gap is 8 units. Preserve paths and proportions. Do not add terminal symbols, orbital rings or honeycomb ornaments.

The silhouette can evoke a TIE Fighter. Retain the approved H, but do not reinforce that association with cockpit details, wings, exhaust or flight effects. The loading motion instead turns the H into parallel execution lanes.

## Color and typography

| Role | Light surfaces | Dark surfaces |
| --- | --- | --- |
| Primary mark and wordmark | #111111 | #F5F5F5 |
| Descriptor | #5F6368 | #A8ADB3 |
| Suggested presentation surface | #FAFAFA | #111111 |

Logo files are transparent; presentation surfaces are not embedded in them. File suffixes refer to the destination theme: `light` is dark artwork for a light surface; `dark` is white artwork for a dark surface. Use the application's resolved theme when manual theme switching exists.

Geist is the source typeface. Wordmark: weight 600. Descriptor: weight 400. Creative artwork uses 400/500/600. All delivered SVG lettering is outlined and has no font-loading dependency. Keep API identifiers and code in the product's existing monospace family. Font attribution is in [FONT-LICENSE.txt](FONT-LICENSE.txt).

Brand colors do not replace semantic success, error or paused-state colors. Do not recolor the logo to communicate operational state.

## Asset selection

| Placement | Asset family |
| --- | --- |
| Expanded navigation | horizontal, without tagline |
| Collapsed navigation or application icon | icon |
| Centered identity placement | vertical |
| Spacious identity placement | horizontal-tagline or vertical-tagline |
| Website hero | creative/hero |
| Social sharing | creative/social; use the PNG export for Open Graph |
| Repository introduction | creative/readme-banner |
| Subtle decorative surface | creative/pattern |
| Motion presentation | creative/motion-storyboard |
| Panel or page loading | loading, orchestration variant |
| Small inline loading | loading-pulse, compact variant |

Each family has light and dark versions. Root-level assets are the reusable identity. `creative/` contains finished applications. `previews/` contains review artifacts and must not be substituted for transparent logos. Earlier explorations under `design/brand/hexagon-logo/` are not the default source for new work.

## Size and clear space

| Asset | Recommended minimum | Typical size |
| --- | --- | --- |
| Static icon | 16px square | 24 / 32 / 48px |
| Horizontal wordmark | 160px wide | 204 × 48px |
| Horizontal with tagline | 300px wide | 408 × 96px |
| Vertical wordmark | 160px wide | 240–320px wide |
| Vertical with tagline | 280px wide | 320 × 232px |
| Orchestration loader | 24px square | 32 / 48px |
| Pulse loader | 16px square | 16 / 20 / 24px |

These are practical recommendations, not certification across every display. Preserve aspect ratio. At constrained sizes, remove the tagline, then switch to the icon. Outside the SVG canvas, allow at least one eighth of the displayed icon height, with a 4px minimum. Preserve internal padding.

## Creative system: controlled divergence

The H is the anchor; parallel lanes are the extension. Routes separate from a shared control point into discrete execution blocks. Repeated blocks may vary in position and opacity while retaining consistent size and spacing. This is abstract brand artwork, not a product architecture diagram.

- Hero: strong left-aligned editorial typography, one routing composition on the right, ample separation. Use real HTML text in production if SEO, selection or localization is required; the SVG is a finished visual composition, not a replacement for semantic page content.
- Social: one headline, one large mark and one product descriptor. Keep essential content inside the safe margins. Export at 1200 × 630 for sharing.
- README: compact horizontal signature, restrained execution-lane motif. Avoid promotional claims that exceed published support evidence.
- Pattern: low-opacity modular H and lane repetition. The 512px tile is transparent and repeatable. Use as a quiet surface, never behind dense text without a solid readability layer.
- Motion storyboard: four conceptual states explain the animation. It is not a pixel-exact export of every animation keyframe.

No decorative gradients, glass, extrusion, neon glow, space imagery or dense topology webs. Do not add more detail simply to fill empty space.

## Motion

Default: H → dispatch → parallel lanes → H. Duration 2400ms, easing `cubic-bezier(.65,0,.25,1)`, with staggered module movement and resting intervals. Only the modules transform; the containing layout remains stable.

Compact: the central bridge contracts and fades while the sides remain still. Duration 1200ms: approximately 600ms motion and 600ms rest. Use this variant at small sizes or when the orchestration motion would distract.

Both loaders stop at a complete static H under `prefers-reduced-motion: reduce`. Neither represents percentage progress. Show one primary loader per waiting region; remove it on success, error or cancellation. Preserve existing content during background refresh where possible. Do not use sound, flashing or continuous whole-mark rotation.

## Accessibility and embedding

Use localized accessible names in the consuming product even though this asset library is English-only. With adjacent status text, use an empty image alt. Without adjacent text, provide an accessible loading label. Use `role="status"` where appropriate and toggle `aria-busy` on the actual loading region. Do not announce each animation frame.

Static SVGs have no scripts, external resources or font dependencies. Animated SVGs include CSS. Validate them against deployment CSP; if necessary, inline the SVG and move animation rules to an allowed stylesheet instead of weakening the global policy.

## Maintenance and evidence

[asset-manifest.json](asset-manifest.json) inventories assets, dimensions, themes and purpose. [README.md](README.md) is the integration entry point. [creative/README.md](creative/README.md) documents the creative deliverables. SVG XML and local references are checked; artwork is rendered for inspection. Prior browser checks cover motion keyframes and reduced-motion behavior, not every browser or deployment policy.

Keep filenames stable. Update the manifest and previews with changes. The project license governs original project artwork; the font retains its own notice. No trademark clearance or exclusivity assessment is claimed. This library has not automatically replaced Console components.

## Exploratory fleet direction

See [Fleet in Formation](FLEET-VISUAL-DIRECTION.md) for the standalone rationale connecting the H silhouette, its TIE-fighter association and Agent fleet choreography. Proposed campaign lines and motions in that memo do not automatically replace the current assets.
