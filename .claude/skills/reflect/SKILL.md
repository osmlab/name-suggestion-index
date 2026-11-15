---
name: reflect
description: Reflect on recent work and bring all project documentation up to date. Use after landing a chunk of work, or when asked to update docs, agent instructions, or project knowledge.
argument-hint: additional optional context
---

Update all project documentation to match the current state of the code. Fix gaps, stale content, spelling mistakes, and anything unclear. Make all edits — do not just list findings. Do not commit; the user will review first.

If the user provided additional context with the prompt, treat it as a focus area (e.g. "only README", "check AGENTS.md is accurate").

## Steps

1. Read `AGENTS.md` to understand the project structure.
2. Review the current chat session history — primary source of context for what changed.
3. Run `git log --oneline -20` to confirm what was actually landed.
4. Search the codebase as needed to verify current state.

## What to update

- Inline documentation (JSDoc, comments)
- Markdown files (`README`, design docs, contributing guides)
- Agent instructions and skills (`AGENTS.md`, `.claude/skills/`, `copilot-instructions`, etc.)
- Project knowledge in `knowledge/` (or whatever convention this project uses, see `AGENTS.md`)
- Design docs in `design/`, if the project has them

## Pruning project knowledge

Follow the conventions in `knowledge/README.md`. In particular:
- Move finished work out of `current.md`: a summary to `completed.md`, the "why" to `decisions.md`, anything learned to `lessons.md`. Delete the rest.
- Remove entries about code or files that no longer exist.
- Check sizes with `wc -c knowledge/*.md`. Condense files that are over the size budgets, oldest entries first, and split a file by topic once pruning isn't enough.
- Keep it public: never move anything from a `PRIVATE.*` file into `knowledge/` without asking.

## Shared playbooks and lessons

agent-practices keeps playbooks and lessons that apply across projects (see `AGENTS.md`). Don't edit them from here. Instead, if this work turned up something general (a tool gotcha, an upgrade step, a playbook or lesson that was wrong or out of date), end with a short list of suggested additions or fixes, drafted in the format the folder's `README.md` describes. Open an issue or PR on agent-practices only if the user agrees. Leave out anything specific to this project, and anything private.
