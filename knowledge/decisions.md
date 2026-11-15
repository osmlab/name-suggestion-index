# Decisions

## Preset builders are pure functions

`buildIDPresets()` and `buildJOSMPresets()` do no I/O, print nothing, and don't mutate their input; the caller decides how to serialize and write. That makes them testable against fixtures and usable by downstream apps, not just by `scripts/dist.ts`. `buildJOSMPresets()` returns a wrapper with `.end({ prettyPrint })` so its call sites stayed the same across the XML library switch.

## `fast-xml-builder` for XML output

The JOSM presets and the sitemap build XML from plain JS objects with `fast-xml-builder`. It replaced `xmlbuilder2`, which is kept out of `dependencies` entirely.

## Matcher delegates location lookups to LocationConflation

Since LC v3, the matcher registers locationSets with LC (`registerLocationSets()`) and keeps only an item → `locationSetID` map. At match time it asks LC which sets cover a point and how big they are. The rejected alternative was the matcher building and exposing its own resolved polygons and `which-polygon` index. That duplicated LC's work and forced Rapid to monkey-patch the matcher to share a cache.

## Library build: externals for Node, bundled for browsers

`scripts/build_js.ts` builds the cjs/mjs outputs with Bun's `packages: 'external'`, which bundles relative imports but leaves bare package specifiers external. The IIFE browser build bundles everything. Relative JSON imports from `config/` are inlined either way, which avoids depending on Node's JSON-import support (stable only from Node 22).

## Two tsconfigs

`tsconfig.json` is broad and `noEmit`: it's used for type-checking (`bun run check:types`). `tsconfig.build.json` extends it, narrows `include` to the public API (`src/nsi.ts` + `lib/ambient.d.ts`), and only emits `.d.ts` files (`bun run build:ts`).

## Type naming in `lib/types.ts`

- `*JSON` types (`NsiJSON`, `NsiTreesJSON`, `NsiWikidataJSON`, …) describe file shapes; other types describe in-memory structures.
- `NsiPath` is a semantic alias for the `tree/key/value` string used throughout.
- `IDPreset.locationSet` and `IDPreset.matchScore` are optional. They're NSI extensions that `buildIDPresets()` writes, and the source iD presets passed in don't have them.
- `NsiCategory.templates` is optional. It's present only in data loaded with `fileTree.read()`, not in the published `nsi.json`. Consumers guard with `category.templates || []`.

## Tests use `node:assert/strict`

`bun:assert` has no type declarations (only `bun:test`, `bun:ffi` and `bun:bundle` are declared in `bun-types`). `node:assert/strict` is typed through `@types/node` and has the same strict-equality semantics.

## Linting with oxlint

ESLint and typescript-eslint were replaced with oxlint (`.oxlintrc.json`) in November 2026. typescript-eslint doesn't support TypeScript 7 yet, and oxlint has a much smaller dependency tree and runs in milliseconds. The config keeps the old ESLint rules wherever oxlint has them. Formatting rules were dropped (`.editorconfig` covers whitespace), as were rules oxlint lacks (`dot-notation`, which oxlint only has as type-aware, `no-undef-init`, `require-atomic-updates`) and deprecated ones. None of them flagged anything at the time.

`"plugins"` is set explicitly, which replaces oxlint's default plugin list, so oxlint's own `oxc` and `unicorn` rules are not on.

## `no-undef` is off

TypeScript already checks for undefined variables, and the linter's version doesn't understand TS type globals like `GeoJSON` or `RequestInit`.
