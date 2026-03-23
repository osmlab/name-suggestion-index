---
description: Review the codebase and suggest (then implement) concrete improvements
---

You are doing an improvement review of this codebase. The goal is to find **concrete, actionable improvements** — not a wishlist. Think like an experienced senior engineer or architect who respects the existing style and doesn't over-engineer.

## What to read first

Get a broad picture of the project before forming any opinions. Use `#codebase` to survey the whole workspace — pay particular attention to:
- Package/dependency manifests (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.)
- Compiler/type-checker config (`tsconfig.json`, `mypy.ini`, etc.)
- Runtime/bundler config (`bunfig.toml`, `vite.config.*`, etc.)
- Build and tooling scripts
- The README — how the project presents itself and what it's for

## Categories to evaluate

For each category below, look for real issues and note them. Skip categories where things look fine — don't invent problems.

**Correctness / bugs**
- Are there any scripts or config values that are plainly wrong? (e.g. calling `npm run` in a Bun-only project)
- Any TypeScript errors or implicit `any` types?
- Any typos in user-facing strings (error messages, log output)?

**TypeScript quality**
- Are types as precise as they should be? (e.g. `String[]` vs `string[]`, missing type annotations on parameters)
- Are there untyped third-party modules that need a `.d.ts` declaration?
- Are there `tsconfig.json` options enabled that don't apply to this project?

**Runtime / tooling overlap**
- Does the project use Node.js APIs where a Bun-native equivalent exists and is simpler? (e.g. `node:fs` vs `Bun.file()`)
- Are there npm/yarn artifacts in the scripts that should use `bun`?
- Are there dependencies that Bun now handles natively (e.g. a test runner, a bundler)?

**Dev experience**
- Is there a fast linter+formatter that would be easy to add? (Biome is a good fit for Bun projects — one tool, zero config, very fast)
- Are there missing or misleading `package.json` scripts?
- Is the `.gitignore` / `.gitattributes` complete and correct?

**Code clarity**
- Are there comments that are outdated or misleading?
- Are there any obvious simplifications (not refactors — just noise removal)?

## How to respond

1. **Group findings by category.** Within each category, distinguish between:
   - 🔴 Real issues (bugs, broken things) — implement the fix immediately
   - 🟡 Improvements (best practices, clarity) — implement unless non-trivial
   - 💡 Suggestions (optional tools, bigger changes) — describe but don't implement; let the user decide

2. **Be direct and brief.** One sentence per finding is usually enough. Don't pad.

3. **Implement the 🔴 and 🟡 items** using file edits. Verify there are no new TypeScript errors afterward.

4. **Do not over-engineer.** A bug fix doesn't need surrounding code cleaned up. A simple improvement doesn't need extra configurability. Only change what needs changing.
