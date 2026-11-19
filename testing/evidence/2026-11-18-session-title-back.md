# Session back navigation

Moved Sessions return link out of the Conversation/Initialization navigation into the title line as a left arrow. The application-owned link has localized aria-label (Back to Sessions / 返回会话列表), visible focus and a 32×36px target. It is only shown for Session detail, including initialization, and hidden on lists/other pages.

Actual browser review: English detail screenshot `.local/title-back.png`; title and arrow aligned in the same row, no return link in tabs. Focus+Enter navigated to #sessions and hid the arrow. Chinese initialization at390px retained accessible label and visible control with no document overflow. `npm run check` and4 localization tests passed. No cloud execution. API and worker left running, temporary ingress stopped.
