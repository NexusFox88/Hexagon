# Journey tab visual correction

The journey links inherited the global sidebar `nav a` radius/margins/height, causing the selected bottom border to curve like a partial button. Scoped those rules to `.rail nav a`. Journey links now own their layout, straight 2px pseudo-element indicator, neutral hover, spacing and inset keyboard-focus outline.

Actual browser review: en/zh-CN, requested desktop 1440 and narrow 390 viewport overrides (browser zoom reported CSS inner widths 1600/433), no document overflow; link and indicator radii both 0px. Visually inspected Chinese desktop/narrow screenshots, including keyboard focus. Clicking Create Agent moved both route and current-step indicator correctly, then returned to Start here. Evidence: `tab-refinement/review.json` and screenshots. CSS-only change; no new unit tests or cloud resources.
