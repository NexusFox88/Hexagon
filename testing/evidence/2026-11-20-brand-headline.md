# Unified brand headline — November 20, 2026

Canonical headline lines are `Your agent fleet.` and `Your infrastructure stack.` in `brand-assets/brand-copy.json`.

Updated the repository README, brand guidelines, fleet direction memo, creative documentation, asset manifest, Hero compositions, social compositions and creative contact sheet. The generator reads the canonical lines for all headline-bearing artwork. Identity descriptors remain descriptive labels rather than alternate campaign headlines.

Verification performed:

- `python3 brand-assets/tooling/build-creative.py` — exit 0; regenerated 12 creative SVGs and the contact-sheet SVG.
- Rendered both social sizes in both themes and the contact sheet with resvg; visually inspected the contact sheet, including the longer Hero headline. No overlapping text or clipped headlines observed.
- Scanned README and all textual brand sources for legacy headline sentences — none found.
- Parsed every brand SVG as XML, parsed the manifest JSON and checked both GitHub PNG exports are 1280 × 640 — passed.
- `git diff --check -- README.md brand-assets` — exit 0.

The GitHub Social preview was already uploaded with the canonical wording in the preceding task. This update synchronizes the repository assets and README with that deployed image. No product behavior or cloud execution changed.
