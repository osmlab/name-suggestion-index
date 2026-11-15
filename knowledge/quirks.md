# Quirks

## wikibase-edit doesn't export its parameter types

Derive them from the API instead, e.g. `Parameters<WikibaseEditAPI['claim']['update']>[0]`. See the type aliases at the top of `scripts/wikidata.ts`.

## wikibase-sdk `SimplifiedClaim` is a union

It needs a cast to `CustomSimplifiedClaim[]` before use.

## `Bun.file().json()` returns `Promise<any>`

There's no type safety unless you cast the result. Where the shape matters, prefer `import … with { type: 'json' }`, which keeps the inferred types (as `lib/matcher.ts` does for the `config/` files).
