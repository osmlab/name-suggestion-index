# Completed work

## November 2026

- **ESM-only package and package checks (v9).** Dropped the CommonJS build, stopped the published types depending on `@openstreetmap/id-tagging-schema`, moved unused `@types/*` packages to devDependencies, and added publint + arethetypeswrong to `bun run all`. Verified with a scratch project: `import` and `require()` on Node 22, Bun loading the TS source, and types resolving under `bundler` and `nodenext` (ESM and CJS) with `types: []` and `skipLibCheck: false`.

- **TypeScript 7.** No config or code changes were needed beyond the version bump (`types: ["bun"]` and `strict` were already set). The generated `.d.ts` files are identical, and type-checking takes well under a second. Afterwards, the tsconfig was tightened (`module: "Preserve"`, `allowUnreachableCode`/`allowUnusedLabels: false`, `isolatedDeclarations` for the build), options TypeScript 7 makes meaningless were removed, and the tests' `as unknown as` casts became `@ts-expect-error`.
- **`noUncheckedIndexedAccess` turned on.** It flagged 380 spots, mostly in tests and `wikidata.ts`. One was a real bug: a template item pointing at a missing source path crashed with a `TypeError` instead of reaching its error message (`file_tree.ts`, `expandTemplates`). The data build and `dist` output were verified identical before and after.
- **ESLint → oxlint.** This was the blocker for TypeScript 7. Lint now takes well under a second, and the lockfile dropped from about 280 packages to about 80. See `decisions.md` for what carried over.

## May 2026

- **JOSM presets and sitemap XML now use `fast-xml-builder`.** `xmlbuilder2` is no longer a dependency. `buildJOSMPresets()` still returns an object with `.end()`, so call sites didn't change.

## April 2026

- **Test suite converted to TypeScript, at 100% coverage.** Test files are `.ts`, covered by `tsconfig.json` and ESLint, and `lib/sort_object.ts` gained its own tests.
- **Pure preset builders.** `buildIDPresets()` (in `lib/presets_id.ts`) and `buildJOSMPresets()` (in `lib/presets_josm.ts`) were extracted from `scripts/dist.ts` and are exported from `src/nsi.ts` with their option/result types. `scripts/dist.ts` is now a thin wrapper that writes their output.
- **`lib/types.ts` overhaul.** Type names now separate source config from generated dist files. Renames that downstream code may hit: `TreesConfig` → `NsiTreesJSON`, `MatchGroupsConfig` → `NsiMatchGroupsJSON`, `GenericWordsConfig` → `NsiGenericWordsJSON`, `ReplacementsConfig` → `NsiReplacementsJSON`, `NsiTreeConfig` → `NsiTreeProperties`, `Dissolution` → `WikidataDissolution`, `RapidPreset` → `IDPreset`.
- **`scripts/` is type-checked.** `tsconfig.json` includes `lib/`, `scripts/`, `src/` and `test/`, and the scripts got a full typing pass.
- **LocationConflation v3 matcher refactor.** The matcher now asks LC at match time (`locationSetsAt()`, `getLocationSetArea()`) instead of keeping its own polygon index, so Rapid no longer has to monkey-patch it to share an LC cache. The public `itemLocation`, `locationSets` and `locationIndex` fields were removed, `which-polygon` was dropped, and the cjs/mjs builds shrank from ~800 KB to ~22 KB.
- **Typing work aligned with [#12067](https://github.com/osmlab/name-suggestion-index/pull/12067)** (k-yle), so it could merge cleanly: two tsconfigs, a generic `sortObject`, a typed `file_tree.ts`, and `NsiDissolved` / `NsiPresets` types for downstream consumers.
- **Stricter TypeScript.** `noImplicitAny`, `noUnusedLocals` and `noUnusedParameters` are on. `locale-compare` was replaced with `Intl.Collator`, and `eslint-plugin-import` enforces `import/no-duplicates`.
- **`scripts/wikidata.ts` overhaul.** It now has full types, retry logic and parallel writes, and it deduplicates P8253 edits through a module-level edit queue.
