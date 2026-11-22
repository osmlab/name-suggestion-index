# Project knowledge

Notes that help agents and people work on this project: what's in progress, what's planned, what's done, and the context the code alone doesn't show. This folder is committed to git and public by design.

Read `current.md` at the start of a session, and the other files when they're relevant. Update them as you work.

## Files

| File | What goes in it | Updated |
|------|-----------------|---------|
| `current.md` | Work in progress right now | Every session |
| `backlog.md` | Planned work and ideas that haven't started | When an idea comes up |
| `completed.md` | Finished work, newest first, grouped by month | When work lands |
| `decisions.md` | Choices that aren't obvious from the code, and why they were made | When a decision is made |
| `lessons.md` | Patterns and gotchas learned in this project | When something goes wrong once |
| `quirks.md` | Known odd behavior and its workarounds | As found or fixed |

Create a file only when there's something to put in it. A small project may only ever need `decisions.md`.

## Conventions

- **`current.md` stays small**: under about 8 KB, active work only. It's read at the start of every session. When work lands, add a summary to `completed.md`, move the "why" to `decisions.md` and anything learned to `lessons.md`, then delete the rest.
- **`backlog.md`**: delete an item once it starts (move it to `current.md`) or is dropped. Work that others should see or discuss belongs in a GitHub issue; link the issue instead of repeating it here.
- **`completed.md`**: newest first, under `## Month YYYY` headings. Write an executive summary: what changed and why it matters, in a sentence or two per item. It isn't a copy of `git log`. Condense older months as they stop mattering.
- **`decisions.md`**: what was decided, why, and what was rejected. Update an entry when the decision is revisited.
- **`lessons.md`**: only lessons about this project. A lesson that would help any project using the same tools belongs in agent-practices' shared [`lessons/`](https://github.com/rapideditor/agent-practices/tree/main/lessons); `/reflect` offers to send it there.
- **Expiry**: if an entry is about code or files that no longer exist, remove it.
- **Size**: measure in KB with `wc -c`, not in lines: one line can be a long paragraph. About 4 bytes is one token. Keep each of the other files under about 40 KB. Past that, split the file by topic into a folder (e.g. `lessons/typescript.md`, `lessons/testing.md`), list the parts in this README, and prune stale entries. Never let one file pass about 100 KB: agents can't read it in a single call, and may read only part of it.
- **Headings**: use `##` headings for topics or entries, so an agent can list them (`grep -n '^## '`) and read only the sections it needs.
- **No commit hashes or file-by-file changelogs**: git has those. Write down the context that isn't in the code, and link to issues, PRs, design docs and external docs instead of copying them.
- **Public**: no secrets and nothing private. Private notes go in a gitignored `PRIVATE.md` (see `AGENTS.md`).
