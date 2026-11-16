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
- Organize skill browsing through a presentation-only ten-track catalog with real lesson counts and first available lessons; keep lesson sources, graders, and progress IDs unchanged.
- Scope compact practice sizing and typography to the structured workspace so landing spreadsheets and other pages remain unchanged.
