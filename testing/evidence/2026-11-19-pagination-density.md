# Compact pagination

Shared pagination class applied to Sessions, operations, tool usage and resource operations. Footer height 36px, controls 32px, vertical padding 2px, page bottom padding 4px. Font remains 13px. Generic actions spacing no longer governs pagination.

Actual Ego browser TaskSpace 52: measured Sessions pagination at 35.998 CSS px, controls at 31.997px, inspected screenshot `.local/pagination-compact.png`, clicked next page, used keyboard Enter on previous page, returned to offset=0, confirmed no horizontal document overflow. Space closed after review. Other consumers share CSS but were not separately browser-tested in this change.
