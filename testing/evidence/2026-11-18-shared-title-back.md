# Shared title back navigation

Generalized Session-only title control to page-back with explicit route parents. Removed the Tool usage body return link, Fleet inline return link and continuation Playground inline link. Session, Tool usage, Fleet resource detail, Run detail and Session-derived Playground share this header behavior; lists hide the arrow.

Actual browser: requested DeepWiki Tool usage displayed title arrow with no old body link; focus+Enter returned to #tools and hid the arrow. Reviewed Session, Fleet and continuation Playground parent URLs and absence of old inline back links. English Tool usage at390px retained visible arrow and no horizontal document overflow. Chinese screenshot `.local/tool-title-back.png`. Typecheck and4 localization tests passed. API/worker left running, temporary ingress stopped.
