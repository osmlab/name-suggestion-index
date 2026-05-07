# Agent Context

This file contains agent-specific guidance only.

At session start, skim [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) for general project information.

---

## Scratchpad

If a `SCRATCHPAD.md` file exists at the repo root (gitignored), read it at session start for additional context on recent work, lessons learned, and known quirks. Update it as you work with any learnings that a future session would benefit from knowing. Don't create one proactively — only when there's something worth persisting.

## Prompt Files

This project has reusable Copilot prompt files in `.github/prompts/`. Your editor surfaces them via the `/` menu (or equivalent). When a task matches an existing prompt, prefer invoking it over improvising — the prompts encode project-specific conventions.

## General Guidelines

### Communication style
- Be concise. Maintainers review many contributions — get to the point.
- Plain language over formal structure. A sentence or two beats a page of headings.
- Don't explain things the maintainer already knows (project context, how Git works, etc.).
- If a PR does one thing, describe that one thing.

### Constructive Pushback
- **Don't just implement what's asked** — briefly flag if you see a concern. The user values a 1-2 sentence heads-up over silent compliance.
- This includes: unnecessary abstractions, deprecated patterns, simpler alternatives, or potential footguns.
- When the user proposes a solution, briefly evaluate whether a more elegant solution exists.
- Keep it proportional: a heads-up is a sentence, not a paragraph. Skip it entirely for trivial changes.

### Secrets hygiene
- Before making any edit or commit, ask: **could this write a secret in plaintext somewhere it shouldn't be?**
- Never put tokens, keys, or passwords in plaintext in any unencrypted file.

### Comments
- **Never remove comments** when modifying files unless:
  - The comment applies to code being removed
  - The meaning of the code has changed
  - Specifically asked to remove them
- Comments contain valuable domain knowledge — preserve them.
- Also **don't add unsolicited comments or docstrings** to code you're modifying. Only add explanatory comments when the user asks, when documenting a non-obvious decision (magic numbers, workarounds), or when the code is genuinely confusing without them.

### Lint warnings
- **Never circumvent lint warnings** by renaming, reformatting, or otherwise disguising the triggering code to silence a rule.
- Lint warnings are intentional project health signals — they should remain visible.
- If your change introduces a new lint warning, mention it; don't silently suppress it.

### File Operations
- Use VS Code file tools (`create_file`, `replace_string_in_file`, `multi_replace_string_in_file`) instead of terminal commands. This shows changes in VS Code's diff view for easier review.
- For bulk/repetitive edits across multiple files, use `multi_replace_string_in_file` with explicit before/after context in each replacement. The exact-match requirement prevents silent damage that regex-based tools can cause.
- **Do not use `sed`, `perl -i`, or inline Python/Node scripts to edit source files.** Greedy regexes (especially around whitespace and line boundaries) can collapse or corrupt code in ways that are hard to spot without a full re-read. If an edit feels too repetitive for `multi_replace_string_in_file`, that's a signal to slow down, not to reach for a script.
- Avoid `cat` with heredoc or other terminal-based file writing.
