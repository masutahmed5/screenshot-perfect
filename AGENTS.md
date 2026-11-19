<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the recognition comparison in an isolated presentation component with scoped animation styles; it must not alter the interactive lesson spreadsheet.
- Keep landing learning-path, trust, and closing visuals in presentation-only sections with scoped styles and existing lesson destinations so they cannot affect lesson behavior.
- Normalize array-based source tracks through the track adapter and auto-register them; keep the strict content schema intact so malformed lessons remain detectable.
- Practice routes use the structured player; legacy lessons retain their original grader through a presentation adapter to preserve answer rules and progress IDs.
- Practice navigation and the left lesson browser are mutually exclusive in AppShell; other pages retain their existing navigation.
- Derive visible skill tracks and their counts/levels from registered lesson content, showing only populated tracks so new JSON tracks appear automatically.
- Prefer updated content/lessons track files over matching src/lessons files, normalizing both through the strict track adapter to prevent stale duplicates.
- Scope compact practice sizing and typography to the structured workspace so landing spreadsheets and other pages remain unchanged.
- Structured shortcut lessons capture normalized chords from the practice worksheet; practice-only navigation and selection live in the sheet adapter, preserving standard/landing sheets and existing formula graders.
- Preserve shortcut validation metadata so navigation lessons verify actual worksheet destinations and ranges as well as the accepted chord sequence.
