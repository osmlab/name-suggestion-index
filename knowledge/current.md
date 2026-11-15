# Current work

## Lessons to send to agent-practices

Collecting general tool lessons during the current round of upgrades; send them all to agent-practices' `lessons/` at the end (`/reflect` can draft them). Add new ones here as they come up.

- **`bun:assert` has no type declarations.** Only `bun:test`, `bun:ffi` and `bun:bundle` are declared in `bun-types`. Use `node:assert/strict` (typed through `@types/node`, same strict-equality semantics).
- **`bun:util` isn't a real module.** It only resolved because Bun is lenient; use `node:util`.
- **Bun bundler, library builds:** the default `packages: 'bundle'` inlines everything (fine for a browser IIFE, wrong for a Node library). `packages: 'external'` keeps bare specifiers external and bundles relative imports; `external: ['*']` does the same more bluntly. Relative JSON imports are inlined either way.
- **zsh `!` history expansion:** a `!` inside double quotes in a shell command triggers history expansion and can hang an agent's terminal. Use single quotes, `set +H`, or a file-edit tool instead of `sed` with `!` in the pattern.
