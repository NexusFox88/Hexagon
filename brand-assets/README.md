# Hexagon brand assets

An English-only library of identity, motion and creative artwork.

Start with [Visual guidelines](BRAND-GUIDELINES.md), [Creative assets](creative/README.md) and the [Asset manifest](asset-manifest.json).

## Creative direction

[Fleet in Formation](FLEET-VISUAL-DIRECTION.md) records the TIE-fighter resemblance, the Agent fleet metaphor, proposed choreography and the boundaries of the reference. It is an exploratory memo, separate from approved assets.

## Identity and motion

All root-level SVGs have transparent backgrounds. `light` means dark artwork for light surfaces; `dark` means white artwork for dark surfaces.

| Family | Files | Canvas |
| --- | --- | --- |
| Icon | hexagon-icon-{light,dark}.svg | 128 × 128 |
| Horizontal wordmark | hexagon-horizontal-{light,dark}.svg | 408 × 96 |
| Vertical wordmark | hexagon-vertical-{light,dark}.svg | 320 × 208 |
| Horizontal with descriptor | hexagon-horizontal-tagline-{light,dark}.svg | 408 × 96 |
| Vertical with descriptor | hexagon-vertical-tagline-{light,dark}.svg | 320 × 232 |
| Orchestration loading | hexagon-loading-{light,dark}.svg | 128 × 128 viewBox |
| Compact pulse loading | hexagon-loading-pulse-{light,dark}.svg | 128 × 128 viewBox |

Wordmark: **Hexagon**. Descriptor: **Agent fleet control plane**. Lettering is outlined from Geist; no fonts need to load at runtime. See [FONT-LICENSE.txt](FONT-LICENSE.txt).

## Website embedding

Copy the chosen assets to your website's public/brand directory:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/brand/hexagon-horizontal-dark.svg">
  <img src="/brand/hexagon-horizontal-light.svg" width="204" height="48" alt="Hexagon">
</picture>
```

For manually selected themes, use the application's resolved theme instead of relying solely on the system preference:

```js
logo.src = `/brand/hexagon-horizontal-${theme === 'dark' ? 'dark' : 'light'}.svg`;
```

Loading with adjacent accessible status text:

```html
<div role="status">
  <img src="/brand/hexagon-loading-light.svg" width="32" height="32" alt="">
  <span>Loading sessions…</span>
</div>
```

In Console, obtain status text from the existing localization catalog. Set aria-busy on the loading region and clear it when loading ends. Both SVG loaders respect reduced-motion preferences. Use the pulse variant for compact 16–20px placements. Confirm SVG styles work under your deployment CSP.

## Previews

- [Identity sheet](previews/brand-sheet.png)
- [Interactive loading preview](previews/loading.html)
- [Motion GIF](previews/loading-motion.gif), demonstration only; does not honor reduced-motion preferences
- [Creative contact sheet](previews/creative-sheet.png)

Presentation backgrounds exist only in the previews and creative compositions. They are not part of the transparent identity files. Assets are prepared for integration; product UI has not been changed automatically.
