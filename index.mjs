/* DATA */
import brands from './dist/brands.json';
import filters from './dist/filters.json';
import matchGroups from './dist/match_groups.json';
import wikidata from './dist/wikidata.json';

/* CODE */
import matcher from './lib/matcher.js';
import simplify from './lib/simplify.js';
import stemmer from './lib/stemmer.js';
import toParts from './lib/to_parts.js';

export {
    brands, filters, matchGroups, wikidata,
    matcher, simplify, stemmer, toParts
};
