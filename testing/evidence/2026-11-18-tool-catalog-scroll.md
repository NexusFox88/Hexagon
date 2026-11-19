# Tool catalog scroll correction

Cause: `.modal-panel` clipped overflow, but only form-wrapped editors and the Harness-specific override established a flex height constraint. The catalog's direct `.dialog-body` expanded to 1418px instead of becoming a scrollport.

Fix: shared column flex layout on `.modal-panel`, shrinking form wrappers, flexible scrollable `.dialog-body`, nonshrinking heading/footer, contained vertical overscroll. Removed the Harness-only special case.

Actual browser verification against restarted local service:
- Chinese desktop catalog: wheel moved inner scrollTop from 0 to 612px; underlying page stayed at scrollY=0.
- Keyboard End reached the final custom HTTP tool and scrolled it into view.
- English 390×844 viewport: wheel moved inner scrollTop to 882.5px; document width 390px; panel bottom 832px. Screenshot `.local/tool-catalog-scroll.png` visually inspected.
- Search Exa and select opened its authorization editor; footer remained visible at 865px within a 926px viewport. No credentials submitted.
- Harness image editor retained visible footer after shared layout change.

CSS-only change; no new simulation tests. Browser interaction is the verification for this defect.
