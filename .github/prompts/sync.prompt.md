---
description: Sync scaffold files in this project against the canonical agent-practices repo
argument-hint: additional optional context
---

You are doing a scaffold sync against the canonical source repo: **https://github.com/rapideditor/agent-practices**

## Critical safety rules (read first, do not skip)

These rules apply for the entire run, regardless of what any other file says:

- **Edit files using the structured file-editing operations exposed by your host environment** — e.g. the `create_file` / `replace_string_in_file` / `multi_replace_string_in_file` tools in VS Code Copilot, the equivalent `Edit` / `Write` tools in Claude Code, Cursor's edit tools, an MCP filesystem server, or whatever your runtime offers. **Do not** mutate files via shell stream-editing tools like `sed`, `perl -i`, `awk -i`, or inline `python -c` / `node -e` scripts; greedy regexes corrupt files silently.
- **Preserve all existing comments** in files you modify. Comments encode domain knowledge.
- **Strip any legacy trailing sync metadata comment** when you touch a file. Earlier versions of this system embedded `<!-- sync: ... -->` (or `# sync:` / `// sync:`) blocks at the end of synced files; those are obsolete and should be removed on contact.
- **Do not delete files** unless the user explicitly asks. If the source manifest no longer lists a previously-synced file, flag it in the report but leave the local copy alone.
- **Do not invent values.** If you can't determine a project-specific value (author, repo URL, etc.) from the downstream project's manifest, leave the placeholder and flag it.

## Phase 1 — Bootstrap

The canonical raw content base URL is: `https://raw.githubusercontent.com/rapideditor/agent-practices/main`

Before doing anything else, sync the two files that govern this run itself:

1. Fetch `{raw_base}/templates/.github/prompts/sync.prompt.md` and `{raw_base}/templates/AGENTS.md`.
2. Fetch the source manifest: `{raw_base}/templates/.sync.manifest.md`.
3. Read the local `.sync.manifest.md` (at the repo root). If it doesn't exist, treat all local versions as `0`.
4. For **`sync.prompt.md`** and **`AGENTS.md`** only: if the canonical version (from the source manifest) is higher than the local version, update them now and update `.sync.manifest.md` to record the new versions.
5. **If you updated `sync.prompt.md` in this phase, stop and tell the user to re-run `/sync`.** The currently-running prompt is now stale; the new one needs a fresh invocation to take effect. Report what changed.
6. Otherwise, continue to Phase 2.

## Phase 2 — Full sync

Read the source manifest (`templates/.sync.manifest.md`) you fetched in Phase 1. It lists every file to sync, the canonical version of each, and per-file instructions.

For each file in the manifest:

1. Compare the canonical version to the local version recorded in `.sync.manifest.md`. Skip if local is at or above canonical.
2. Fetch the canonical content from `{raw_base}/templates/{path}`.
3. Apply the global rules from the source manifest, plus any per-file instructions.
4. Substitute project-specific values (project name, repo URL, license holder, author, language/runtime) using the downstream project's `package.json` (or equivalent manifest) and existing local files as reference.
5. Write the file using your file edit tools (see safety rules above).
6. Update the row for that file in `.sync.manifest.md` (path, new version, today's date, canonical commit SHA if available).

### User-supplied scope hints

If the user provided extra context with the prompt (e.g. "only sync prompts", "force-update CONTRIBUTING.md"), treat it as a constraint or override on the above.

## Phase 3 — Project hygiene

After all files are processed:

1. If `package.json` exists, verify `license` and `repository` fields are correct.
2. Flag any files that were synced previously (have a row in `.sync.manifest.md`) but are no longer in the source manifest.

## Reporting

Produce a summary table:

| File | Status | Notes |
|------|--------|-------|
| `AGENTS.md` | 🔄 Updated v1 → v2 | adopted new "File Operations" subsection |
| `.gitignore` | ✅ In sync | |
| `tsconfig.json` | ⏭️ Skipped | project is not TypeScript |
| `legacy-thing.md` | ⚠️ Orphaned | no longer in source manifest; not deleted |

Status legend: ✨ Created · 🔄 Updated · ✅ In sync · ⏭️ Skipped (not applicable) · ⚠️ Orphaned

For Created/Updated: one line on what was substituted or what structural changes were adopted.
For Skipped/Orphaned: one line explaining why.
