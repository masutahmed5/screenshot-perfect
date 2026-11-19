# Phase 0 — lesson-player redesign audit

## Verified baseline
- Opened `/practice/L009` at 1440 × 900 and 390 × 844; no runtime errors.
- Desktop page fits the viewport, but has a permanent lesson browser and truncated titles. Mobile page is 1945px tall at an 844px viewport.
- Existing player, worksheet, lesson-browser and progress tests: **30 passed across four files**.
- Registered content contains 23 numbered lessons in two tracks, with 115 steps. Lesson 09 has five steps, not the three illustrated in the reference.
- All 115 steps currently lack explicit checklists. Track, hints, platform-specific accepted sequences and shortcut cheat-sheet data already exist.
- Formula editing, references, selection, navigation and normalized shortcut capture already exist; reuse these rather than replacing the worksheet engine.

## Intended files
### Change
- `src/components/AppShell.tsx`: use a dedicated practice shell without changing navigation on other pages.
- `src/components/ContentLessonPlayer.tsx`: connect step progress, Learn/Practice presentation, platform selection, hints, reset and feedback to existing checking and progress functions.
- `src/components/Sheet.tsx`: add opt-in practice presentation/capture hooks; preserve standard and landing worksheet behavior.
- `src/styles.css`: isolate the requested light/dark palette, typography and scrollbar rules under the redesigned practice screen.
- `src/components/ContentLessonPlayer.test.tsx` and `src/components/Sheet.variant.test.tsx`: extend behavioral regressions for new controls and keyboard escape rules.
- `AGENTS.md`: record new structural boundaries as they are introduced.
- `roadmap.md`: track the phases.

### Create
- `src/components/lesson-player/primitives.tsx`: Keycap, StatusGlyph, ProgressRing and SegmentedControl.
- `src/components/lesson-player/WorkspaceShell.tsx`: top bar, responsive panes and accessible persisted divider.
- `src/components/lesson-player/LessonDrawer.tsx`: accessible grouped/searchable drawer using registered tracks and actual progress.
- `src/components/lesson-player/LearnPane.tsx`: unchanged lesson information presented as goal, cheat sheet and worksheet examples.
- `src/lib/lesson-player-presentation.ts` and adjacent tests: browser-safe presentation helpers and data-derived checklist state.
- Focused tests beside new modules where behavior needs coverage.

### Delete
- No source files or lesson content. Remove the old permanent-sidebar and shortcut-header presentation only from the practice path; retain controls needed by other pages.

## Decisions and safeguards
- Use real catalog counts, lesson titles, number of steps and accepted Windows/Mac sequences, not illustrative screenshot values.
- Retain formula/legacy graders, progress IDs, hint availability, XP calculations and streak rules. Hint costs must reflect the existing `3 XP` reduction per hint and `2 XP` floor, not introduce a new charge.
- No Cloud connection or backend work is necessary for this presentation request. Persist only requested UI preferences locally; reuse existing progress storage.
- Do not invent account identity, authentication, locks or daily-goal data. Existing guest state remains guest state.
- Derive checklists conservatively from existing prompts and validation metadata. Do not mark an inferred intermediate action as completed without observable evidence. Flag fallback-derived items when implemented.
- Preserve the existing distinction between formula, shortcut, multiple-choice and menu-action questions; a redesign must not eliminate the latter controls or make them impossible to check.
- Schema changes so far: **none**. Only add checklist typing if implementation requires it; existing track and hints fields need no schema changes.
- Reuse Geist and JetBrains Mono, existing Button and Radix primitives; no new UI or animation library.
- Preserve landing and course-overview styles and navigation.

## Contrast audit of requested colors
Minimum contrast of each text token across its three requested background/surface colors:

| Theme | Primary text | Secondary text | Tertiary text |
| --- | --- | --- | --- |
| Light | 15.56:1 | 6.84:1 | 5.03:1 |
| Dark | 13.89:1 | 8.15:1 | 4.70:1 |

All six pass 4.5:1. White on the requested dark brand green is **2.99:1**, so use dark foreground text on that button (**6.26:1**). White on the light brand green passes at **5.34:1**. Borders, focus, selected states and rendered combinations still require the Phase 6 audit.

## Evidence
Baseline screenshots are retained at `/tmp/browser/player-audit/before-desktop.png` and `before-mobile.png`; they are audit evidence, not app assets.

## Phase boundary
Phase 0 changes documentation only. Implementation starts with Phase 1 foundations in the next phase; the current application remains unchanged.