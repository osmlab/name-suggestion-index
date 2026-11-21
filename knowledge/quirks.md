# Quirks

## wikibase-edit retries `maxlag` errors forever

Its retry loop has no attempt limit, and waits `5s × attempt` between tries (it can't read the `Retry-After` header, because the response headers are a `Headers` object, not a plain one). If Wikidata's lag stays above our `maxlag` (30 in `scripts/wikidata.ts`), `bun run wikidata` stalls on one edit, each wait longer than the last. Wikidata reports the current lag in the error, and `api.php?action=query&maxlag=-1` returns it on demand.

## A huge edit count from `bun run wikidata` means something changed on Wikidata

A normal run makes a handful of edits, sent one at a time (about one a second). Thousands means something like a bulk edit on Wikidata, as in NSI#13076. Stop the run, and find out which kind of edit dominates before letting it continue.

## wikibase-edit doesn't export its parameter types

Derive them from the API instead, e.g. `Parameters<WikibaseEditAPI['claim']['update']>[0]`. See the type aliases at the top of `scripts/wikidata.ts`.

## wikibase-sdk `SimplifiedClaim` is a union

It needs a cast to `CustomSimplifiedClaim[]` before use.

## `Bun.file().json()` returns `Promise<any>`

There's no type safety unless you cast the result. Where the shape matters, prefer `import … with { type: 'json' }`, which keeps the inferred types (as `lib/matcher.ts` does for the `config/` files).
