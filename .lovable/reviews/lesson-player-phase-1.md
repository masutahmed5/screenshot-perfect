# Phase 1 — foundations

## Delivered
- Scoped light/dark palette, typography, spacing, radii, motion, focus and thin-scrollbar foundations under `.gw-lesson-player`.
- Existing practice content uses the new palette and type scale; landing styles remain unchanged.
- Reusable `Keycap`, `KeycapCombo`, `StatusGlyph`, `ProgressRing` and keyboard-accessible `SegmentedControl` are ready for later phases. They do not change shortcut checking or introduce platform selection into the current lesson.
- Loaded the real 600 weight of the existing mono font for keycaps.

## Files touched
- `src/styles.css`
- `src/components/ContentLessonPlayer.tsx` (scope class only)
- `src/components/lesson-player/primitives.tsx`
- `src/components/lesson-player/primitives.test.tsx`
- `src/routes/__root.tsx` (existing font weight only)
- `AGENTS.md`, `roadmap.md`, this report

## Verification
- 36 tests passed across the new controls and existing structured player, sheet selection/reference display, browser and progress tests.
- Live guest worksheet accepted the complete value `500`.
- Live L014 formula `=B2*C2+D2` returned `41`, displayed Correct and offered Next step.
- Checked light/dark practice, 1077×769 desktop and 390×844 mobile; no horizontal page overflow or runtime errors. Landing body colors were unchanged before/after practice navigation.
- Current preview build: OK.
- Screenshots retained in `/tmp/browser/player-phase1`: light, dark, formula-correct, current-viewport and mobile.
- Direct browser mounting of the not-yet-integrated primitives did not succeed in the temporary inspection harness; their selection, arrow-key behavior, disabled choice and progress bounds were verified by six passing tests. Integrated visual verification remains for the phases that use them.

## Contrast and review decisions
- Minimum primary/secondary/tertiary text contrast over all three surfaces: light **15.56 / 6.84 / 5.03**, dark **13.89 / 8.15 / 4.70**. All pass 4.5:1.
- CTA foreground/background: light **5.34**, dark **6.26**; dark buttons use dark text rather than failing white text.
- Completed status glyph foreground/background: light **5.02**, dark **10.76**.
- Requested border-strong colors fail 3:1 for a hollow status indicator (1.51 light, 1.56 dark); the not-started status circle uses tertiary text color instead. Decorative borders retain the supplied colors. The comprehensive UI-border audit remains Phase 6.
- Existing outer navigation and worksheet selection colors are deliberately unchanged; their replacements belong to later phases. Dark styling currently covers the player content, not the old shell.
- Lesson schemas, content, grading, XP, streaks, hint rules and progress IDs are unchanged.

## Pause
Phase 1 complete. Phase 2 and subsequent phases require the user's next instruction; no work continues after this turn.