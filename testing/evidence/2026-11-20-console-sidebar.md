# Sidebar label correction

User screenshots showed Credentials & secrets wrapping outside its fixed-height selected background. The global monospace font increased the required text width beyond the previous 224px rail budget.

Changed `apps/console/design-system.css`: Console rail width 256px; navigation rows use automatic height, 36px minimum and 8px block padding; icons do not shrink; workspace avatar remains 26×26px. Complete labels remain visible. Original logo, interface icons, loading artwork, colors and handlers are retained.

Actual verification:
- `npm run local -- restart`: exit 0, managed restart completed.
- ego-browser live Console: en/zh-CN × light/dark × 1440/390, 8 sidebar checks passed. All navigation label rectangles contained by their links, no link horizontal overflow, no document horizontal overflow. Desktop English labels all single line (20px), rows 36px. Avatar measured 26×26px.
- Keyboard Enter on Secrets navigation retained the expected #secrets route.
- Visually inspected desktop English and narrow Chinese dark screenshots. Narrow screenshot also shows the original Hexagon loading artwork.

Evidence: `console-global-design/sidebar.json`, `console-global-design/sidebar-{locale}-{theme}-{width}.png`.
Earlier 136 route checks in `console-global-design/routes.json` predate this sidebar-width correction and do not certify its final full-page layout. This follow-up verifies the sidebar specifically; it does not claim provider/cloud acceptance.
