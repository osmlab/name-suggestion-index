# Agent Context

This file contains agent-specific guidance only.

Read [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) first for general project information.

---

## Scratchpad

You can use a `SCRATCHPAD.md` file (gitignored) for persistent working memory across chat sessions. At the start of a session, read it for additional context on recent work, lessons learned, and known quirks. As you work, feel free to update the scratchpad with any learnings that a future session would benefit from knowing.

## Prompt Files

This project has reusable Copilot prompt files in `.github/prompts/`:

- `/commit` — stage and commit all changes
- `/reflect` — update all project documentation with the current state of the code
- `/release` — prepare a new release (CHANGELOG entry + version bump); accepts version number as input
- `/suggest` — review the codebase and suggest concrete improvements
- `/sync` — sync scaffold files against a source repo; accepts source repo URL as input

When asked to do one of these tasks, prefer using the prompt file rather than improvising.

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

### Secrets hygiene
- Before making any edit or commit, ask: **could this write a secret in plaintext somewhere it shouldn't be?**
- Never put tokens, keys, or passwords in plaintext in any unencryped file.

### Comments
- **Never remove comments** when modifying files unless:
  - The comment applies to code being removed
  - The meaning of the code has changed
  - Specifically asked to remove them
- Comments contain valuable domain knowledge - preserve them
