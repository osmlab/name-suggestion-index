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

`tsconfig.json` is broad and `noEmit`: it's used for type-checking (`bun run check:types`). `tsconfig.build.json` extends it, narrows `include` to the public API (`src/nsi.ts`), and only emits `.d.ts` files (`bun run build:ts`). The build config also sets `isolatedDeclarations`, so everything reachable from the public API needs explicit types, and the published types can't change by accident.

## Type naming in `lib/types.ts`

- `*JSON` types (`NsiJSON`, `NsiTreesJSON`, `NsiWikidataJSON`, …) describe file shapes; other types describe in-memory structures.
- `NsiPath` is a semantic alias for the `tree/key/value` string used throughout.
- `IDPreset.locationSet` and `IDPreset.matchScore` are optional. They're NSI extensions that `buildIDPresets()` writes, and the source iD presets passed in don't have them.
- `NsiCategory.templates` is optional. It's present only in data loaded with `fileTree.read()`, not in the published `nsi.json`. Consumers guard with `category.templates || []`.

## ESM-only package, with its own `Preset` types

Since v9 the package ships only an ES module (`dist/js/nsi.mjs`); the `require` export condition points at it too, which works on Node 20.19+ / 22.12+. There's deliberately no `engines.node` (Yarn 1 fails installs on a mismatch); the README states the minimum. The IIFE (`dist/js/nsi.iife.js`) and the nsi.guide bundle (`dist/js/nsiguide.js`) stay at their paths, because CDN users and nsi.guide load them by URL. `exports` maps `"./dist/js/*"` to `null`, so those scripts can't be imported by subpath (they aren't ES modules), while `"./dist/*"` keeps the JSON and other data files importable.

`lib/types.ts` declares `Preset` / `Presets` / `RelationSchema` itself, mirroring id-tagging-schema v7, so the published `.d.ts` files don't import from that 72 MB package. `scripts/dist.ts` and the tests pass the upstream type to `buildIDPresets()`, which catches drift. `bun run package` (publint + arethetypeswrong on the packed tarball) runs as part of `bun run all`.

## `noUncheckedIndexedAccess` conventions

The flag is on, so every index into a record or array may be `undefined`. The patterns used across the codebase:
- Iterate with `Object.entries()` / `Object.values()` instead of `Object.keys()` followed by `obj[key]`.
- Split paths with a tuple cast: `const [t, k, v] = tkv.split('/', 3) as [NsiTree, string, string];`. Paths come from validated data, so the cast documents the assumption once instead of guarding every use.
- In tests, `assert.ok(x)` narrows a lookup, and `result[0]!` is fine right after a length assertion. Prefer `!` over `?.` there, so a missing element fails loudly instead of passing an `undefined` comparison.

## Tests use `node:assert/strict`

`bun:assert` has no type declarations (only `bun:test`, `bun:ffi` and `bun:bundle` are declared in `bun-types`). `node:assert/strict` is typed through `@types/node` and has the same strict-equality semantics.

## Linting with oxlint

ESLint and typescript-eslint were replaced with oxlint (`.oxlintrc.json`) in November 2026. typescript-eslint doesn't support TypeScript 7 yet, and oxlint has a much smaller dependency tree and runs in milliseconds. The config keeps the old ESLint rules wherever oxlint has them. Formatting rules were dropped (`.editorconfig` covers whitespace), as were rules oxlint lacks (`dot-notation`, which oxlint only has as type-aware, `no-undef-init`, `require-atomic-updates`) and deprecated ones. None of them flagged anything at the time.

`"plugins"` is set explicitly, which replaces oxlint's default plugin list, so oxlint's own `oxc` and `unicorn` rules are not on.

`.oxlintrc.json` lists only what differs from oxlint's defaults. It doesn't repeat rules the `correctness` category already turns on, set `"off"` on rules no category turns on, or give options that match a rule's defaults. Option names are oxlint's (`preferInline`), which aren't always ESLint's (`prefer-inline`).

## `no-undef` is off

TypeScript already checks for undefined variables, and the linter's version doesn't understand TS type globals like `GeoJSON` or `RequestInit`. In oxlint it's a `nursery` rule, which no enabled category turns on, so `.oxlintrc.json` doesn't need to mention it. Don't turn it on.

## No reference on NSI identifier (P8253) claims

`scripts/wikidata.ts` used to add `stated in` (P248) = `name suggestion index` (Q62108705) to every P8253 claim it managed (NSI#4648). In November 2026 a Wikidata editor removed those references in bulk as redundant on an external identifier, which is the usual Wikidata convention. Re-adding them meant about 36,000 edits per run (NSI#13076) and an edit war, so the script no longer adds or checks references.

The script also matches existing claims to NSI ids by value, not by sorted position, so adding or removing one id is one edit instead of an update to every claim after it.
