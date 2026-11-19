# Scroll chrome and table headings

Shared Console and modal scroll regions hide persistent scrollbar chrome while retaining overflow, wheel/touch and keyboard behavior. Forced-colors mode restores native scrollbars. Table heading groups are sticky; embedded tables have a bounded vertical scroller so their overflow-x container does not leave headers attached to an unconstrained box.

Live 8787 browser checks after guarded service restart:
- Session list scrolled 400px; heading y remained 274.9132 before/after; document scroll remained zero.
- Keyboard End on focused Session table reached its bottom (1251.67px); heading stayed fixed.
- Playground panel/code computed scrollbar-width:none and retained overflow:auto. Mouse wheel moved the left form to 140.56px while document scroll stayed zero.
- Visually inspected English/dark Session and Playground screenshots, plus Chinese/light Playground after wheel scrolling.
- console-theme, console-navigation, console-i18n: 3 files / 9 tests passed.

This is presentation verification; no cloud tasks were submitted. Embedded reference-table bounding was code-reviewed; no claim of exhaustive live data for every nested table.
