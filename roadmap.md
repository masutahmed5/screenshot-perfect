# Tasks

- [x] Add practice-only grid navigation, range selection, keystroke display, and synchronized live formula references.
- [x] Connect structured shortcut lessons to the live worksheet; verified live selection, typing 500, undo/redo, formula result 41, mobile row selection, and 70 tests.

- [x] Fix shortcut capture for multi-character Type tokens, shifted symbols, and Mac Fn navigation; verified live L009/L012/L006 shortcut grading and all 62 tests without changing spreadsheet controls.

- [x] Remove old lesson content and empty tracks, retain the updated Track 01, and verify automatic track cards, lesson links, and practice navigation; all 47 tests pass.

- [x] Load array-based JSON tracks directly and expose their 13 numbered lessons in the catalog and browser; unnumbered checkpoint retained in source, outside the numbered catalog.
- [x] Use the structured practice layout for all lessons, with left lesson browser and mutually exclusive hamburger navigation.
- [x] Verify imported questions, existing formula checking, and desktop/mobile navigation.

- [x] Redesign only the learning path, Why Gridwise, and closing CTA; verify existing lesson links and four screen sizes. Placement-test link omitted because no placement test exists and routing is out of scope.

- [x] Redesign only the recognition section and verify its once-on-scroll animation, CTA, and mobile layout.

- [x] Verify Excel-style in-cell editing + click-to-insert cell references in the preview (Sheet.tsx rewrite)
- [x] Add landing-page story sections below hero/stats strip per uploaded brief (new gw- component, nothing else changed)
- [x] Browser-check landing sections (hero unchanged, 360px + 1920px, empty testimonials/founderNote render nothing)
- [x] Add the two supplied descriptions side by side in the closing section; verify desktop side-by-side, mobile stacking, no overflow.
- [x] Update "For every level" section title and description with the supplied copy; verified heading, description, mobile stacking, no overflow.
- [x] Practice page: zoomed-out spreadsheet via single scale setting (0.88), right-side lesson list panel (groups, search, progress, collapse), drawer on tablet/mobile, Prev/Next lesson buttons; landing sheet untouched.
- [x] Show ten track cards, track lesson lists, and first-lesson choices using available content only. Tracks 09–10 are marked coming soon until lesson content is supplied; purchasing remains unchanged.
- [x] Compact only the structured practice workspace and increase its text sizes by 0.5px; verified Track 01 navigation, level filtering, mobile layout, and a correct formula in the live spreadsheet.
