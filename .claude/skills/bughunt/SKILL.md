---
name: bughunt
description: Hunt for logic bugs in the current batch of work (a branch, or recent commits) before testers find them. Reports a numbered list of findings; makes no edits.
disable-model-invocation: true
argument-hint: "optional scope or focus, for example: `since v2.1`, `the save path only`"
---

Find the bugs in the current batch of work before anyone else does. You are looking for **logic bugs that break the code's own assumptions**: a state two parts of the code disagree about, an object read after it was replaced, a cache that outlives what it was computed from, an event that doesn't carry everything that changed, a path that works once but not after undo, reload, or a second try. Not style, naming, or missing docs.

**Report only. Do not edit any file in the repo, and do not commit.** The user goes through the list with you and decides what to fix.

If the user gave a scope or focus with the prompt, use it. Otherwise the batch of work is the current branch compared with the default branch (or, on the default branch, the commits since the last release tag, plus anything uncommitted).

This is the most expensive skill in the set: it runs several agents in parallel, and it should. A bug a tester finds costs far more than the tokens spent finding it first.

## 1. Understand the batch

1. Read `AGENTS.md` (and any folder-level `AGENTS.md`) for the project's structure, test commands, and rules.
2. List what changed: `git log --oneline <base>..HEAD` and `git diff --stat <base>...HEAD`. Note the most-changed files and the systems they belong to.
3. Read the design docs, working notes, and commit messages for this work, so you know what the code is *meant* to do. A bug is a gap between intent and behavior; you need the intent.
4. Split the batch into 3–6 **areas** that can be reviewed independently (e.g. "core data model", "selection and modes", "save and sync", "services and rendering"). Pick the area with the most interlocking state (the core) for yourself. Each area should be about one system and its callers.

## 2. Hand the other areas to fresh reviewers, in parallel

Start one subagent per area, all at once, in the background (in Claude Code, the Agent tool; in other hosts, whatever runs parallel agents). Fresh agents are the point: they read the code without your assumptions, so they find what you'd talk yourself out of. Give each one a self-contained brief:

- **Context:** the project, the branch, and that testing starts soon. **They must not edit the repo.**
- **Their area:** the design docs to read for intent, and the files to review with `git diff <base>...HEAD -- <file>` (name them; say which file a deleted or merged file's old code lives in).
- **What counts:** "logic bugs that break the code's own assumptions", plus 4–6 *concrete examples specific to their area* (e.g. "a selection that names an entity which no longer exists after undo", "a cache keyed by ID that a new version of the same ID hits"). Concrete examples steer far better than categories.
- **How:** prove findings with repro tests or scripts in their own scratch folder (give them the absolute path, and how to import the project's modules and test library from there). Synthetic data only. No real external services, no writes to anything shared (production APIs, the user's browser session, databases).
- **Report format:** a list, most severe first. For each: `file:line`, what breaks as a concrete scenario (steps → wrong result), confidence (*confirmed by repro, name the file* or *found by reading*), and a one-sentence likely fix. Then a short **"checked and fine"** list of risky spots they looked at and cleared, so coverage is visible. No preamble.

Don't do their areas yourself while they run.

## 3. Hunt your own area by experiment, not by reading

Reading finds some bugs; experiments find the ones nobody would think of. Build a **randomized invariant harness** for the core (a scratch-folder test, never in the repo):

- **Drive it like the app does:** random sequences of the real operations (edit, commit, undo, redo, revert, transactions, checkpoints, data arriving mid-session, reset), seeded so any failure replays.
- **Check invariants after every step**, each against an independent answer:
  - *Events are complete:* build a mirror of the state only from emitted change events, and compare it with the real state. Consumers (renderers, validators, indexes) only see the events.
  - *Indexes and caches agree with brute force:* spatial or lookup indexes against a full scan; memoized answers against a fresh computation; derived data (shapes, totals, summaries) against a rebuild.
  - *Referential integrity:* everything referenced exists, in every version the user can get back to (the redo stack and saved checkpoints too, not just the current state).
  - *Round trips:* save → restore, serialize → parse, ID → parse → ID.
- **Stop each seed at the first broken step** and print the seed, the step, and the last ~8 operations.
- **Distrust your harness first.** Most early failures are harness bugs: an operation real code never performs (a raw low-level call where the app uses a higher-level action), comparing by identity where value equality is the contract, key order in objects, a wrong model of what a listener does. Fix the harness until every remaining failure is something the app could really do.
- **Once a bug is confirmed, tolerate it and keep going:** record it once per seed, exclude what it breaks from the other checks, and run more seeds, so it doesn't hide the next bug. Check that later failures aren't just downstream of it.
- Scale up when it's clean: hundreds of seeds, longer histories.

If the project has a way to drive the real app (see `AGENTS.md`), also do a **live soak** on real data: a few hundred random real operations with the same invariant checks and an error listener. Undo or discard everything afterwards, and don't touch the user's saved state.

## 4. Verify what comes back

Agents report wrong findings in the same confident tone as right ones. For each finding before it goes on the list:

- **Rerun its repro.** Check its polarity: some repros *fail* to show a bug (they assert correct behavior), others *pass* (they assert the broken behavior). Read the test name and assertions.
- For the high-severity ones, **read the code yourself** and confirm the cause.
- **New or pre-existing?** Compare with the base branch (`git show <base>:<file>`). Pre-existing bugs still go on the list, marked as such.
- Merge duplicates, and drop anything that's intended and documented (or list it under "not bugs" with the reason).

## 5. Report one list

Give the user a single numbered list (numbers run across sections, so they can say "let's do 4"), grouped by severity:

- **High: fix before testers.** Crashes, data loss, wrong data written anywhere shared, or a broken main flow.
- **Medium.** Wrong results in less common flows.
- **Low.** Contrived, latent, or cosmetic.
- **Already in the base branch.** Worth knowing; not caused by this batch.

For each: what breaks, in one or two plain sentences; where (`file:line` as a link); and status (*new* or *pre-existing*, *confirmed* or *reading only*). Start with a short paragraph on coverage: what was exercised and came back clean (seeds × steps, live runs, round trips), so the user knows how much the empty spaces mean. End with where the repros are, and a recommendation of which to fix first.
