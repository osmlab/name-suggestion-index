---
name: checkup
description: Check up on a repo after time away — where things stand, whether it still builds, security alerts, outdated dependencies, sync manifest drift, and what a newer model would do differently. Reports a numbered list; makes no edits. Use when returning to a project after a while, or when asked for a checkup or health check.
argument-hint: "optional focus, for example: `security only`, `skip the build`"
---

Give this repo a checkup after time away: find out where things stand, what has drifted while nobody was looking, and what you'd do differently now. This is about **drift since the last round of work**, not a general code review (that's `/suggest`).

**Report only. Do not edit files, upgrade dependencies, sync, or commit.** Installing from the existing lockfile and running the existing build and tests is fine. The user picks which items to act on.

If the user gave a focus with the prompt, use it. If a check can't run (no network, no `gh`, a missing tool), say so in the report and move on.

This skill assumes a Bun project. For other ecosystems, use the equivalent commands (see [Other ecosystems](#other-ecosystems)).

## 1. Where things stand

Before running anything, recover context:

- Read `AGENTS.md`, the project's knowledge (`knowledge/current.md` and `knowledge/backlog.md`, see `AGENTS.md`), a root `PRIVATE.md` if there is one, and skim the `README`.
- `git log -1 --format='%ad %s' --date=short` gives the **last-activity date**. It anchors section 6.
- `git status`, `git stash list`, unpushed commits (`git log @{u}..` if there's an upstream), and local branches not merged into the default branch.
- Leftover branches on the remote. List them with `git ls-remote --heads origin`, not `git branch -r`: remote-tracking refs keep branches that were already deleted on GitHub until a `git fetch --prune`.
- If `gh` is available: open PRs and issues (`gh pr list`, `gh issue list`), and recent CI runs on the default branch (`gh run list --branch <default> --limit 5`).
- Open items in `current.md` and `backlog.md`. Some may be easy now, or obsolete.
- `knowledge/` files over the size budgets in `knowledge/README.md`. Suggest `/reflect` to prune them.

## 2. Baseline health

Find out whether the project works *as it is*, before anyone upgrades anything:

- `bun install --frozen-lockfile`. A failure here (lockfile out of step with `package.json`) is itself a finding.
- Run the project's check, build, and test scripts from `package.json` (often `bun run all`). Skip anything that deploys, publishes, or starts a long-running server.
- Run `git status` again afterwards. If the build changed tracked files, report it.

Record pass or fail, and for failures, the first real error. If the baseline is red, read everything else in that light.

## 3. Security

- `bun audit` for known vulnerabilities in installed dependencies.
- If `gh` is available, GitHub's open alerts: `gh api 'repos/{owner}/{repo}/dependabot/alerts?state=open'`, and the same for `code-scanning/alerts` and `secret-scanning/alerts`. A 403 or 404 usually means the feature is off or the token lacks access; note it and move on.
- For each vulnerability: package, severity, direct or transitive, whether it reaches shipped code or only dev tooling, and the fixed version.
- For secret-scanning alerts, give the alert number, secret type, and location. **Never repeat the secret value** in the report.

## 4. Dependencies and tooling versions

- `bun outdated`. Group patch and minor updates (usually safe together) apart from major ones (each needs a look at its changelog), and name the major bumps that matter most.
- Deprecated or unmaintained packages, and packages Bun or the platform now handles natively.
- Runtime: the installed `bun --version`, `engines.bun` in `package.json`, and the latest Bun release.
- GitHub Actions: compare each `uses:` pin in `.github/workflows/` with the action's latest release (`gh api repos/{owner}/{action}/releases/latest --jq .tag_name`).

**Check live sources for every version number** (the registry, `gh`, release pages). Don't trust memory: even a newer model's knowledge stops before today.

## 5. Sync status

Report what `/sync` would change, without doing it. (If this repo *is* agent-practices, skip this section.)

1. Fetch the source manifest: `https://raw.githubusercontent.com/rapideditor/agent-practices/main/templates/.sync.manifest.md`.
2. Read the local `.sync.manifest.md` at the repo root. If it doesn't exist, say the project hasn't been synced yet and recommend `/sync`.
3. For each file in the source manifest, compare versions (missing row = version 0). Use the per-file instructions to tell files that are behind apart from files that don't apply here (e.g. `tsconfig.json` in a project without TypeScript).
4. Also note orphaned rows (in the local manifest, gone from the source) and legacy `.github/prompts/*.prompt.md` files still present.

Make this one item that lists what's behind (local → canonical version) and recommends `/sync`, not one item per file. Show each file's local Notes next to it: they record deliberate differences from the template, so that drift is expected, not a problem.

## 6. What's changed since the last activity date

You are probably a newer model than whatever last worked here. Look at what changed between the last-activity date and now, and what you'd do differently:

- Runtime and language features that replace hand-rolled code or a dependency (new Bun APIs, newer TypeScript or ECMAScript features).
- Deprecated APIs, config options, and patterns still in use (`tsconfig.json`, `bunfig.toml`, workflows, scripts).
- Better tools or services for jobs the project does in a roundabout way.
- **Playbooks**: fetch `https://raw.githubusercontent.com/rapideditor/agent-practices/main/playbooks/README.md` and check each playbook's "Applies when" against this project. Make each one that applies its own item, linking the playbook, and note any order between them.
- **Agent instructions** in `AGENTS.md` and `.claude/skills/`: workarounds for older models' limits that are no longer needed, instructions that host features now cover, and stale project facts. If the fix belongs in a synced file, say it should go to agent-practices rather than be changed locally.

Be specific: name the file, what to change, and why it's better now. If you aren't sure something is newer than the last-activity date, or stable yet, check the docs or say so. Don't pad this section; no items is a fine answer.

## Other ecosystems

| | Bun | npm | Cargo | Python (uv) |
|---|---|---|---|---|
| Install from lockfile | `bun install --frozen-lockfile` | `npm ci` | `cargo build --locked` | `uv sync --locked` |
| Audit | `bun audit` | `npm audit` | `cargo audit` | `uvx pip-audit` |
| Outdated | `bun outdated` | `npm outdated` | `cargo outdated` | `uv pip list --outdated` |

`cargo audit` and `cargo outdated` are separate installs. If one is missing, say so rather than installing it.

## Report

Start with a short **Where things stand** paragraph: last-activity date, branch and working-tree state, CI on the default branch, and whether the baseline build and tests pass.

Then one numbered list (numbers run across sections, so the user can say "do 1, 3, and 5"), grouped by section: Baseline, Security, Dependencies, Sync, and Since {last-activity date}. Skip empty sections. Mark each item:

- 🔥 Broken or risky — fix soon (failing build, exploitable vulnerability, red CI)
- 👉 Worth doing (outdated dependency, deprecated option, sync behind)
- 💡 Worth tracking (bigger change, a newer approach to consider)

End with what to do first, and whether `/suggest`, `/bughunt`, or `/triage` (for a backlog of open issues and PRs) is worth running next.
