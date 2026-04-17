---
description: Reflect on recent work and bring all project documentation up to date
argument-hint: additional optional context
---

Update all project documentation to match the current state of the code. Fix gaps, stale content, spelling mistakes, and anything unclear. Make all edits — do not just list findings. Do not commit; the user will review first.

## Steps

1. Read `AGENTS.md` to understand the project structure.
2. Review the current chat session history — primary source of context for what changed.
3. Run `git log --oneline -20` to confirm what was actually landed.
4. Search the codebase as needed to verify current state.

## What to update

- Inline documentation (JSDoc, comments)
- Markdown files (`README`, design docs, contributing guides)
- Agent instructions (`AGENTS.md`, `copilot-instructions`, etc.)
- Working memory (`.scratchpad/*`)
