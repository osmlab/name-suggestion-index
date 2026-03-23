---
description: Reflect on recent work and bring all project documentation up to date
---

You are doing a documentation update pass. Recent code changes may have left docs, guides, and inline comments out of date. Your job is to find and fix those gaps — not to write new documentation for its own sake.

**Do not commit.** Make all edits and stop. The user will review before committing.

## How to approach this

First, get oriented:
1. Review the current chat session history — this is your primary source of context for what was discussed, decided, and changed
2. Run `git log --oneline -20` to see recent commits and confirm what was actually landed
3. Use `#codebase` to survey the current state of the project

Then work through each documentation layer below.

---

## Documentation layers to check

### SCRATCHPAD.md (if present)
A working-memory file for agents (gitignored). Update it with:
- Any new quirks, gotchas, or lessons learned from recent work
- Any known issues or follow-up tasks worth remembering
- Remove anything that is now resolved or stale

### AGENTS.md (if present)
Agent context file. Check that:
- The described project structure still matches reality
- Any tool, script, or workflow guidance is still accurate
- Nothing important from recent work is missing

### README.md
The public face of the project. Check that:
- The feature list / description still reflects what the project does
- Setup and usage instructions still work as written
- Any referenced scripts, commands, or file paths still exist and are correct
- Version numbers or compatibility notes aren't stale

### CONTRIBUTING.md (if present)
Check that:
- Development setup instructions are still accurate
- Any described workflow (build steps, naming conventions, PR process) reflects current practice

### Other markdown files (CHANGELOG.md, RELEASE.md, etc.)
- CHANGELOG: verify the most recent entry matches the current `package.json` version (or equivalent). Flag if they're out of sync — but do not generate a new changelog entry here; that's for `/release`.
- RELEASE.md or similar: check that documented release steps match current tooling

### Prompt files (`.github/prompts/*.prompt.md`, `.instructions.md`, etc.)
Check that:
- Referenced file paths, script names, and commands still exist
- Any example version numbers or outputs are not misleading
- Steps are still in the right order

### Inline code documentation
Look for comments in source files that reference something that has since changed:
- Outdated file paths or module names
- Comments describing behavior that has been refactored
- TODO/FIXME comments that have been resolved by recent work (remove or update them)

---

## How to respond

For each layer, report one of:
- ✅ **Up to date** — nothing to do
- 🟡 **Updated** — briefly describe what you changed
- 💡 **Flag for user** — something needs a human decision (e.g. a CHANGELOG version mismatch, a structural README question)

Keep it brief. One line per finding is enough.
Make all edits directly — don't ask for permission on small fixes.
