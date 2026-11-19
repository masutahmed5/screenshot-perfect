# Lesson-player phases 2–6

## Delivered by phase
- **2 — Shell:** Full-viewport practice-only shell, real lesson breadcrumb, previous/next links, segmented step progress, existing guest XP/streak, local theme preference, responsive Learn/Practice switching, mouse/keyboard divider with 340px/480px minimums, double-click reset and saved ratio.
- **3 — Drawer:** Replaced persistent lesson browser with Radix modal drawer; actual levels/tracks/counts, wrapped lesson titles, progress/status shapes, search across tracks, highlighted title matches, empty results, keyboard result navigation, search focus, focus trap/restore and Ctrl/Cmd+K outside worksheet capture. Resume uses an existing in-progress lesson, not invented progress.
- **4 — Learn:** Goal callout, condensed intro plus expandable full About, data-derived shortcut rows, syntax, tabbed read-only before/after worksheet examples, and unchanged Watch out content. No lesson source files were edited.
- **5 — Practice:** One live worksheet, platform choice connected to existing accepted sequences, conservative prefix checklists, consolidated hints/reset/check, visible existing hint cost, 300ms checking state, specific shortcut expected/actual feedback, cell feedback, keycap strip, success focus and XP animation. Existing formula and legacy graders, progress IDs, hint availability and XP/streak rules retained.
- **6 — Verification:** Desktop, tablet, phone, light/dark, reduced-motion, keyboard release, drawer focus and actual practice interactions checked.

## Files
- Changed: `AppShell.tsx`, `ContentLessonPlayer.tsx` and tests, `Sheet.tsx` and variant tests, `src/styles.css`, `src/lib/progress.test.ts`, `AGENTS.md`, `roadmap.md`.
- Added: `lesson-player/WorkspaceShell.tsx`, `LessonDrawer.tsx`, `LearnPane.tsx`, `src/lib/lesson-player-presentation.ts` and tests, this review.
- Deleted: no files or lesson content.
- Schema changes: **none**.

## Evidence
- **85 tests passed across 17 files.** Includes all existing formula/shortcut/MCQ/menu/workbook flows and new pane limits, complete Type:500 checklist evidence, capture Escape exception, reserved key pass-through, platform acceptance, Reset/Check state and unchanged 3 XP hint deduction / 2 XP floor.
- Real L009: Ctrl+Z accepted; 60 → 70 → undo produced B2=60 and Correct; 500 → undo → redo produced B2=500 and Correct.
- Reload resumed Step 3 of 5. Divider ArrowRight changed ratio by 2%, reload restored it, double-click reset to 40%.
- L014 `=B2*C2+D2` produced E2=41 and Correct.
- Drawer keyboard search opened L004; Shift+Down ×3 selected B3:B6 and graded Correct.
- Worksheet Ctrl+K did not open drawer; outside-sheet Ctrl+K did. Double Escape released capture when permitted. Drawer trapped focus and restored it to Lessons.
- 10 rows visible at 1440×900; page height matches viewport. Phone had no horizontal page overflow; action controls stayed visible.
- No page runtime errors in the live verification. Current build OK. Landing remains outside player shell.
- Screenshots retained under `/tmp/browser/player-complete/`, including desktop, drawer, shortcut-correct, formula-correct, tablet, mobile-learn and mobile-dark.

## Contrast
- Primary/secondary/tertiary text minima: light **15.56/6.84/5.03**, dark **13.89/8.15/4.70**.
- Focus accent on surface: light **5.67**, dark **6.64**.
- Primary CTA: light **5.34**, dark **6.26**.
- Success icon on success surface: light **4.47**, dark **7.85**; error icon: light **5.92**, dark **5.48**. Icons pass 3:1.
- Decorative requested borders remain lower-contrast; meaningful empty-circle/control boundaries use tertiary-text color. Disabled controls are not included in text contrast pass claims.

## Deliberate limits / follow-ups
- All existing steps lack authored checklist predicates. Shortcut checklists use exact observed sequence prefixes; they are not a general semantic event-log engine. Formula/MCQ/menu checklist completion uses the unchanged final grader, not invented partial correctness. Source data remains intact.
- Existing unsupported mouse/menu-like shortcut tokens still need domain-specific simulations; this redesign does not pretend those actions are implemented. Browser-reserved Ctrl/Cmd+W/T/N are passed through and not simulated.
- Shortcut error feedback is now specific. Existing formula, MCQ and menu grading messages remain authoritative; not every existing message was rewritten to the brief’s exact examples. No inferred partial-progress coaching was added.
- Before/after example states are derived only from supplied cells/results; they are not interactive replay. Missing intermediate example states are not authored here.
- Locked glyph is supported by foundations, but no lessons are locked because the catalog has no lock policy. No daily-goal ring or fictional identity was added.
- Hints retain existing availability restrictions rather than making all three available unconditionally. XP costs remain visible in the control/tooltip; the compact phone layout hides the inline cost but retains the tooltip.
- Hints and longer feedback can use internal practice scrolling; a universal no-layout-shift guarantee for arbitrary future lesson content is not claimed.
- Native title tooltips are used for compact icon controls; drawer has entry animation and focus handling, but no dedicated animated exit delay.