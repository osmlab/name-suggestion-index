import XMLBuilder from 'fast-xml-builder';

import type { DissolvedMap, NsiData, NsiPath, NsiTree, NsiTreeProperties } from './types.ts';
import type { XmlBuilderOptions } from 'fast-xml-builder';

const xmlBuilderOptions = {
  ignoreAttributes: false,
  suppressEmptyNode: true
} satisfies XmlBuilderOptions;

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

/** Options for {@link JOSMPresetsSerializer.serialize}. */
export interface JOSMPresetsSerializerOptions {
  /** If `true`, produce indented, human-readable XML; if absent or `false`, produce compact single-line XML. */
  prettyPrint?: boolean;
}

/**
 * Returned by {@link buildJOSMPresets}. Holds the built-up preset data and can
 * serialize it to XML on demand, with or without pretty-printing.
 */
export interface JOSMPresetsSerializer {
  /**
   * Serialize the presets to an XML string beginning with the UTF-8 declaration.
   * @param opts - Serialization options
   * @returns An XML string. Pass `{ prettyPrint: true }` for indented output;
   *          omit or pass `false` for compact single-line output.
   */
  serialize(opts?: JOSMPresetsSerializerOptions): string;
}

interface JOSMKeyXML {
  '@_key': string;
  '@_value': string;
}

interface JOSMItemXML {
  '@_name': string;
  '@_type': string;
  key: JOSMKeyXML[];
}

interface JOSMBranchGroupXML {
  '@_name': string;
  group: JOSMGroupXML[];
}

interface JOSMLeafGroupXML {
  '@_name': string;
  item: JOSMItemXML[];
}

type JOSMGroupXML = JOSMBranchGroupXML | JOSMLeafGroupXML;

interface JOSMPresetsXML {
  '?xml': {
    '@_version': '1.0';
    '@_encoding': 'UTF-8';
  };
  presets: {
    '@_xmlns': string;
    '@_author': string;
    '@_shortdescription': string;
    '@_description': string;
    '@_link': string;
    '@_version': string;
    group: JOSMBranchGroupXML;
  };
}


/**
 * Build JOSM tagging presets from NSI data, organised into nested groups
 * by `tree → key → value`.
 *
 * Returns a {@link JOSMPresetsSerializer}; call `result.serialize({ prettyPrint: true })`
 * for indented output or `result.serialize()` for compact single-line output.
 *
 * This is a pure function: it does no I/O, performs no console output, and does not
 * mutate any of its inputs.
 *
 * @see https://josm.openstreetmap.de/wiki/TaggingPresets
 *
 * @param data - NSI category data indexed by `tree/key/value` path
 * @param opts - Project metadata and optional dissolution map
 * @returns A serializer that produces either pretty-printed or minified XML
 */
export function buildJOSMPresets(data: NsiData, opts: BuildJOSMPresetsOptions): JOSMPresetsSerializer {
  const dissolved = opts.dissolved || {};

  const topGroup: JOSMBranchGroupXML = { '@_name': 'Name Suggestion Index', group: [] };
  const xml: JOSMPresetsXML = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    presets: {
      '@_xmlns': 'http://josm.openstreetmap.de/tagging-preset-1.0',
      '@_author': 'Name Suggestion Index',
      '@_shortdescription': 'Name Suggestion Index',
      '@_description': opts.description,
      '@_link': 'https://github.com/osmlab/name-suggestion-index',
      '@_version': opts.version,
      group: topGroup
    }
  };

  let tPrev, kPrev, vPrev;
  let tGroup: JOSMBranchGroupXML | undefined;
  let kGroup: JOSMBranchGroupXML | undefined;
  let vGroup: JOSMLeafGroupXML | undefined;

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
    const tChanged = t !== tPrev;
    const kChanged = tChanged || k !== kPrev;
    const vChanged = kChanged || v !== vPrev;

    if (tChanged) {
      tGroup = { '@_name': t, group: [] };
      topGroup.group.push(tGroup);
    }
    if (kChanged) {
      kGroup = { '@_name': k, group: [] };
      tGroup!.group.push(kGroup);
    }
    if (vChanged) {
      vGroup = { '@_name': v, item: [] };
      kGroup!.group.push(vGroup);
    }

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
      vGroup!.item.push({
        '@_name': item.displayName,
        '@_type': presetType,
        key: Object.entries(item.tags).map(([osmkey, osmvalue]) => ({
          '@_key': osmkey,
          '@_value': osmvalue
        }))
      });
    }

    tPrev = t;
    kPrev = k;
    vPrev = v;
  }

  return {
    serialize(opts?: JOSMPresetsSerializerOptions): string {
      const builder = new XMLBuilder({
        ...xmlBuilderOptions,
        format: opts?.prettyPrint === true
      });
      return builder.build(xml);
    }
  };
}
