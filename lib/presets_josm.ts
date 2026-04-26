import xmlbuilder2 from 'xmlbuilder2';

import type { XMLBuilder } from 'xmlbuilder2/lib/interfaces.js';
import type { DissolvedMap, NsiData, NsiPath, NsiTree, NsiTreeProperties } from './types.ts';

// Imported JSON (will be inlined by bun)
import treesJSON from '../config/trees.json' with {type: 'json'};

const trees: Record<NsiTree, NsiTreeProperties> = treesJSON.trees;
const withLocale = new Intl.Collator('en-US').compare;  // specify 'en-US' for stable sorting


/** Options for {@link buildJOSMPresets}. */
export interface BuildJOSMPresetsOptions {
  /** Project version stamped into the `<presets version="...">` attribute. */
  version: string;
  /** Project description stamped into the `<presets description="...">` attribute. */
  description: string;
  /** Map of NSI item id → dissolved record. Items present here are excluded from the output. */
  dissolved?: DissolvedMap;
}


/**
 * Build JOSM tagging presets from NSI data, organised into nested groups
 * by `tree → key → value`.
 *
 * Returns the `xmlbuilder2` root document; the caller chooses how to serialize
 * (e.g. `result.end({ prettyPrint: true })` or `result.end()` for minified).
 *
 * This is a pure function: it does no I/O, performs no console output, and does not
 * mutate any of its inputs.
 *
 * @see https://josm.openstreetmap.de/wiki/TaggingPresets
 *
 * @param data - NSI category data indexed by `tree/key/value` path
 * @param opts - Project metadata and the dissolutions map
 * @returns the XML root document
 */
export function buildJOSMPresets(data: NsiData, opts: BuildJOSMPresetsOptions): XMLBuilder {
  const dissolved = opts.dissolved || {};

  const root = xmlbuilder2.create({ version: '1.0', encoding: 'UTF-8' });
  const presets = root.ele('presets')
    .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
    .att('author', 'Name Suggestion Index')
    .att('shortdescription', 'Name Suggestion Index')
    .att('description', opts.description)
    .att('link', 'https://github.com/osmlab/name-suggestion-index')
    .att('version', opts.version);

  const topGroup = presets
    .ele('group')
    .att('name', 'Name Suggestion Index');

  let tPrev, kPrev, vPrev;
  let tGroup, kGroup, vGroup;

  const paths = Object.keys(data).sort(withLocale) as NsiPath[];
  for (const tkv of paths) {
    const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"

    // Which wikidata tag is considered the "main" tag for this tree?
    const wdTag = trees[t as NsiTree].mainTag;

    // Include only items that have a wikidata tag and are not dissolved..
    const items = (data[tkv].items || [])
      .filter(item => {
        const qid = item.tags[wdTag];
        if (!qid || !/^Q\d+$/.test(qid)) return false;   // wikidata tag missing or looks wrong..
        if (dissolved[item.id]) return false;            // dissolved/closed businesses..
        return true;
      });

    if (!items.length) continue;  // skip this path

    // Create new menu groups as t/k/v change
    if (t !== tPrev)  tGroup = topGroup.ele('group').att('name', t);
    if (k !== kPrev)  kGroup = tGroup!.ele('group').att('name', k);
    if (v !== vPrev)  vGroup = kGroup!.ele('group').att('name', v);

    // Choose allowable geometries for the category
    let presetType;
    if (t === 'flags') {
      presetType = 'node';
    } else if (k === 'route') {
      if (v === 'ferry') {  // Ferry hack! ⛴
        presetType = 'way,closedway,relation';
      } else {
        presetType = 'relation';
      }
    } else if (k === 'power' && (v === 'line' || v === 'minor_line')) {
      presetType = 'way,closedway';
    } else if (k === 'power' && (v === 'pole' || v === 'tower')) {
      presetType = 'node';
    } else {
      presetType = 'node,closedway,multipolygon';   // default for POIs
    }

    for (const item of items) {
      const preset = vGroup!
        .ele('item')
        .att('name', item.displayName)
        .att('type', presetType);

      for (const [osmkey, osmvalue] of Object.entries(item.tags)) {
        preset.ele('key').att('key', osmkey).att('value', osmvalue);
      }
    }

    tPrev = t;
    kPrev = k;
    vPrev = v;
  }

  return root;
}
