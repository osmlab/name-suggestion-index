---
description: Review the codebase and suggest improvements
argument-hint: additional optional context
---

Find concrete improvements and flag things worth tracking for future work. Respect the existing style; don't over-engineer. Report findings only — do not make edits. The user will choose which suggestions to implement.

## Steps

1. Read `AGENTS.md` to understand the project structure.
2. Survey the codebase, paying particular attention to:
   - Package/dependency manifests (`package.json`, etc.)
   - Compiler/type-checker config (`tsconfig.json`, etc.)
   - Runtime/bundler config (`bunfig.toml`, etc.)
   - Build and tooling scripts
   - `README` — how the project presents itself

## Categories to evaluate

Skip categories where things look fine. Don't invent problems.

**Correctness / Bugs** — wrong config values, broken scripts, typos in user-facing output

**Code Quality** — outdated practices, duplicated logic, unnecessary indirection, misleading comments, obvious simplifications

**Performance** — unnecessary looping, extra copies, redundant calls, known slow browser APIs

**TypeScript** — imprecise types, overuse of `any`/`unknown`, untyped third-party modules, irrelevant `tsconfig.json` options

**Testing** — coverage gaps, tests that don't actually verify what they claim

**Runtime / tooling** — `node:*` APIs where Bun-native equivalents exist, `npm`/`yarn` artifacts in scripts, dependencies Bun now handles natively

**Developer Experience** — missing or misleading `package.json` scripts, incomplete `.gitignore`/`.gitattributes`, missing docs or source comments

**Architecture / Technical Debt** — signs that complexity is accumulating: growing god-objects, framework or library choices that are becoming a liability, inconsistent patterns across similar code, coupling that makes changes harder than they should be, conventions the project has outgrown

## How to respond

Group findings by category. Number each suggestion sequentially across all categories (1, 2, 3…) so the user can refer to them by number. For each finding:
- 🔥 Actionable issue (bug, broken) — should be fixed soon
- 👉 Improvement (best practice, clarity) — worth doing
- 💡 Suggestion (optional, bigger change) — idea to track for future work
