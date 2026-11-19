# Brand loading adaptation

Replaced the CSS outline pulse with the exact brand-assets full-motion SVG for page loading and pulse SVG for busy buttons. Both themes use their matching asset; SVGs contain reduced-motion rules. Added preload hints after slow-network review exposed delayed first-use image loading. Existing localized loading copy is announced with role=status.

The shared page loading state fills the available #content area (not a fixed 180px block). Browser measurement on the running 8787 service confirmed identical content/loading bounds: 1291.11 × 538.36 CSS pixels. Actual route changes under 5-second network latency were visually inspected in Chinese/light and English/dark; final screenshots showed the loaded, centered brand mark. Network throttling was reset. The service was restarted using its guarded launcher, so live assets are current.

Validation: console-theme and console-i18n tests passed (2 files, 7 tests). No cloud allocation was needed for this presentation change.
