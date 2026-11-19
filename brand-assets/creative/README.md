# Creative applications

Concept: **Controlled divergence**. A shared control point orchestrates independent execution lanes. The visual system extends the modular H without adding decorative technology symbols.

| Deliverable | Light / dark files | Dimensions | Surface |
| --- | --- | --- | --- |
| Website hero | hero-light.svg / hero-dark.svg | 1440 × 800 | Opaque |
| Social / Open Graph | social-light.svg / social-dark.svg, plus PNG exports | 1200 × 630 | Opaque |
| GitHub social preview | github-social-light.svg / github-social-dark.svg, plus PNG exports | 1280 × 640 | Opaque |
| Repository banner | readme-banner-light.svg / readme-banner-dark.svg | 1280 × 320 | Opaque |
| Repeating modular pattern | pattern-light.svg / pattern-dark.svg | 512 × 512 | Transparent |
| Motion storyboard | motion-storyboard-light.svg / motion-storyboard-dark.svg | 1280 × 360 | Opaque |

Canonical headline: **Your agent fleet. / Your infrastructure stack.**

Website, README and social previews use the same two lines. The source is [`brand-copy.json`](../brand-copy.json); the generator reads it for every headline-bearing composition.

Descriptor: **Self-managed Agent fleet control plane**.

Supporting copy: **Bring your Sandbox, Harness and LLM.**

All SVG typography is outlined. These are finished visual assets, not editable UI components. For a production website, reproduce editorial copy as semantic HTML where selection, accessibility, SEO or localization matters. Use PNG exports for Open Graph, since social crawlers do not consistently accept SVG images. The pattern tile repeats without crossing its canvas boundaries and should remain subtle. Do not put dense text directly over it.

The routing artwork is an abstract brand illustration, not a verified architecture diagram. Storyboard frames describe the motion concept rather than exact intermediate keyframes.

To regenerate creative SVGs, run `python3 brand-assets/tooling/build-creative.py` from the repository with fontTools and Brotli installed. It reads the existing Geist font from apps/console/fonts. Font attribution remains in the parent folder. Rendering exports requires a separate SVG renderer; they must be refreshed and inspected after source changes.

The GitHub social variants extend the existing social artwork by 40px horizontally and 5px vertically without stretching it. Important content stays at least 64px inside the canvas. Upload `github-social-dark.png` in repository Settings → General → Social preview; GitHub accepts a single image, so the light export is an alternative, not an automatic theme switch.
