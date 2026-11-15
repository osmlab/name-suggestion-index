# Current work

## Lessons to send to agent-practices

Collecting general tool lessons during the current round of upgrades; send them all to agent-practices' `lessons/` at the end (`/reflect` can draft them). Add new ones here as they come up.

- **`bun:assert` has no type declarations.** Only `bun:test`, `bun:ffi` and `bun:bundle` are declared in `bun-types`. Use `node:assert/strict` (typed through `@types/node`, same strict-equality semantics).
- **`bun:util` isn't a real module.** It only resolved because Bun is lenient; use `node:util`.
- **Bun bundler, library builds:** the default `packages: 'bundle'` inlines everything (fine for a browser IIFE, wrong for a Node library). `packages: 'external'` keeps bare specifiers external and bundles relative imports; `external: ['*']` does the same more bluntly. Relative JSON imports are inlined either way.
- **ESLint → oxlint playbook, additions from doing it here:**
  - `eslint-plugin-import` carries over: add `"import"` to `plugins` and keep the `import/` rule names (e.g. `import/no-duplicates`).
  - Setting `"plugins"` replaces oxlint's default list (`eslint`, `typescript`, `unicorn`, `oxc`), so the `unicorn` and `oxc` correctness rules turn off. That's closer to the old ESLint behavior, but worth knowing.
  - `// eslint-disable-next-line @typescript-eslint/…` comments still work; oxlint maps the prefix.
  - Look for ESLint `remove-matcher` steps in *every* workflow, not just `build.yml` (NSI also had one in `build-commit.yml`).
  - ESLint 10 dropped the `compact` formatter, so use the default formatter when capturing a baseline.
- **TypeScript 7 playbook, additions from doing it here:**
  - The per-file verify command needs the project's other module options too, e.g. `--allowImportingTsExtensions` for `.ts` import specifiers and `--resolveJsonModule` for JSON imports. In a loop under zsh, put the flags in an array (`O=(…)`, then `tsc $O file`); zsh doesn't word-split a plain string variable.
  - TypeScript silently ignores a file listed in `include` that doesn't exist. NSI's `tsconfig.build.json` still listed a deleted `lib/ambient.d.ts`. Worth a check during the upgrade.
- **zsh `!` history expansion:** a `!` inside double quotes in a shell command triggers history expansion and can hang an agent's terminal. Use single quotes, `set +H`, or a file-edit tool instead of `sed` with `!` in the pattern.
