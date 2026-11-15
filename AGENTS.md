# Agent Context

This file contains agent-specific guidance only.

At session start, skim [`README.md`](README.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md) for general project information.

---

## Project knowledge

The [`knowledge/`](knowledge/README.md) folder holds notes for agents and people working on this project: work in progress, the backlog, completed work, decisions, lessons, and quirks. It's committed to git and public.

At session start, read `knowledge/current.md` if it exists, and pull in the other files when they're relevant. Update them as you work. [`knowledge/README.md`](knowledge/README.md) says what goes where, and how to prune.

### Design docs

If this project has a `design/` folder, it holds design docs for the larger systems: what each one owns, the decisions behind it, and where it's heading. `design/README.md` lists them.
- **Before changing one of those systems, read its design doc.** If your change alters the design, update the doc in the same change.
- When you make a substantial change to a system that has no design doc yet, suggest starting one.

### Private notes

Files named `PRIVATE.*` (e.g. `PRIVATE.md`, `PRIVATE.json`) are gitignored, and can be in any folder. They hold notes that shouldn't be public, such as personal context or unreleased plans.
- At session start, read `PRIVATE.md` at the repo root if it exists.
- Search tools usually skip gitignored files. Before working in a folder, check for a `PRIVATE.*` file there by opening the path directly, or list them all with `find . -name 'PRIVATE.*' -not -path '*/node_modules/*'`.
- Use the exact uppercase name. On a case-sensitive file system, `.gitignore` won't match `private.md`.
- Never copy anything from these files into committed files without asking.
- Private isn't secret: no tokens, keys or passwords here either (see "Secrets hygiene" below).

## Skills

This project has reusable agent skills in `.claude/skills/`: one folder per skill, each with a `SKILL.md` in the open Agent Skills format. Claude Code and VS Code Copilot both find them there and list them in the `/` menu (or equivalent). When a task matches an existing skill, prefer invoking it over improvising — the skills encode project-specific conventions.

## Shared playbooks and lessons

[agent-practices](https://github.com/rapideditor/agent-practices) also keeps knowledge that applies across projects. It isn't synced here; fetch it when it's relevant:
- **Playbooks** for one-time upgrades (e.g. ESLint → oxlint, TypeScript 7): `https://raw.githubusercontent.com/rapideditor/agent-practices/main/playbooks/README.md`
- **Lessons**, gotchas with the tools we use (Bun, TypeScript, packaging, git): `https://raw.githubusercontent.com/rapideditor/agent-practices/main/lessons/README.md`

Before an upgrade, a tooling change, or packaging work, read the index and then only the entries that apply. This project's own conventions win where they differ. If you learn something that would help other projects, say so; `/reflect` can draft it for agent-practices.

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
- **Edit files using the structured file-editing operations exposed by your host environment** — e.g. the `create_file` / `replace_string_in_file` / `multi_replace_string_in_file` tools in VS Code Copilot, the equivalent `Edit` / `Write` tools in Claude Code, Cursor's edit tools, an MCP filesystem server, or whatever your runtime offers. These show changes in a reviewable diff and (where applicable) require exact-match context, which prevents silent damage that regex-based tools can cause.
- For bulk/repetitive edits across multiple files, prefer a multi-edit operation (e.g. `multi_replace_string_in_file`) over many separate calls when your environment supports it.
- **Do not** mutate files via shell stream-editing tools like `sed`, `perl -i`, `awk -i`, or inline `python -c` / `node -e` scripts. Greedy regexes (especially around whitespace and line boundaries) can collapse or corrupt code in ways that are hard to spot without a full re-read. If an edit feels too repetitive for the structured edit tools, that's a signal to slow down, not to reach for a script.
- Avoid `cat` with heredoc or other terminal-based file writing.
