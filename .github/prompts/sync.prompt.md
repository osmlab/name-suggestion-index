---
description: Sync scaffold files in this project against a source repo, creating or updating files with details adapted to this project
argument-hint: source repo URL or owner/repo, e.g. https://github.com/<owner>/<repo>
---

You are doing a scaffold sync. For each file in the manifest below, fetch the source version, compare it to the local version, and **create or update the local file** — substituting any source-specific details with this project's equivalent. The goal is to carry the source's structure and generic content forward while keeping this project's identity intact.

## Setup

The source repo is: **${input:source_repo}**

Before doing anything else:
1. Read this project's `package.json` (or equivalent manifest) to learn: project name, description, repo URL, license, author(s), and language/runtime.
2. Read the source repo's `package.json` too — you'll need to know which details to substitute.
3. Convert the source repo URL to a raw content base URL:
   - `https://github.com/owner/repo` → `https://raw.githubusercontent.com/owner/repo/main`

---

## Scaffold file manifest

Process each file below. For every file: fetch the source, read the local version (if it exists), then apply the specific instructions listed.

- `.github/prompts/commit.prompt.md` — generic workflow; substitute any repo-specific examples or URLs
- `.github/prompts/reflect.prompt.md` — generic; substitute any repo-specific layer references (file names, tools, etc.)
- `.github/prompts/release.prompt.md` — adapt the workflow to this project's release process (don't just string-replace tool names — rethink the steps if the workflow is fundamentally different); substitute repo URL and tooling references
- `.github/prompts/suggest.prompt.md` — generic; substitute any repo-specific examples or file paths
- `.github/prompts/sync.prompt.md` — generic; the argument-hint uses a placeholder URL and should not need substitution
- `.gitattributes` — adapt file-type entries to match this project's actual file types (e.g. add `*.sh` if the project has shell scripts, drop `*.ts` if it doesn't use TypeScript); if local file exists, add missing entries without removing local-only ones
- `.gitignore` — merge: add entries from source that are absent locally; do not remove local-only entries
- `AGENTS.md` — the general guidelines section is portable; substitute project-specific references (scratchpad notes, file paths, tool names) with this project's equivalents; preserve any local sections that have no counterpart in the source
- `CONTRIBUTING.md` — adapt to this project's tooling and runtime (don't just string-replace tool names — rethink setup steps and commands if the build workflow differs); keep the source's structural sections
- `LICENSE.md` — if the local license type matches this project's `package.json`, it's correct — skip regardless of what the source uses; only flag if the local file contradicts this project's own `package.json`
- `README.md` — preserve this project's actual description, icon list, and any unique content; adopt structural sections (badge layout, contributing footer, license block) from the source if they are absent locally; do not overwrite meaningful local content with source content
- `RELEASE.md` — substitute this project's repo URL, branch names, and tooling references
- `bunfig.toml` — skip entirely if this project does not use Bun; otherwise apply source content with any registry or test configuration substituted for this project's equivalents
- `tsconfig.json` — apply structural changes and new compiler options from the source; flag any option that differs in value and ask before overwriting, since local values may be intentional

---

## Steps

For each file in the manifest:

1. Fetch the raw source content from `{raw_base_url}/{file_path}` (skip gracefully if the source repo doesn't have it)
2. Check whether the file exists locally
3. Identify all source-specific values: repo name, org, URLs, package names, author names, version numbers, tool names — anything that belongs to the source project rather than the template structure
4. Replace each source-specific value with the corresponding value from this project (from `package.json` or existing local files)
5. Create or update the local file with the adapted content

---

## How to report

After processing all files, produce a summary table:

| File | Status | Notes |
|------|--------|-------|
| `.github/prompts/commit.prompt.md` | ✅ In sync / 🔄 Updated / ✨ Created / ⏭️ Skipped | … |
| … | … | … |

For each **🔄 Updated** or **✨ Created** file: briefly describe what was substituted or what structural changes were adopted.

For **⏭️ Skipped** files: one line explaining why (e.g. "source repo doesn't have this file" or "Bun not used in this project").

For files that were **✅ In sync**: one line is enough.

