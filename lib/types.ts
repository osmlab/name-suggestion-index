import type { HasLocationSet, LocationSet } from '@rapideditor/location-conflation';


/** Tags must always consist of key,value string pairs (no undefined) */
export type OsmTags = Record<string, string>;


//
// NSI core data structure types
//

/** The supported NSI tree types. */
export type NsiTree = 'brands' | 'operators' | 'transit' | 'flags';

/** Tree properties as defined in `config/trees.json`. */
export interface NsiTreeProperties {
  emoji: string;
  mainTag: string;
  sourceTags?: string[] | undefined;
  nameTags: {
    primary: string;    // regex pattern string
    alternate: string;  // regex pattern string
  };
}

/**
 * A slash-delimited `tree/key/value` path that uniquely identifies an NSI category.
 * Examples: `"brands/amenity/fast_food"`, `"operators/route/bus"`, `"flags/man_made/flagpole"`.
 */
export type NsiPath = string;

/** Category-level exclusion patterns (regex strings matched against names). */
export interface NsiExclude {
  generic?: string[];
  named?: string[];
}

/** Properties for a category (one {@link NsiPath}). */
export interface NsiCategoryProperties {
  path: NsiPath;
  skipCollection?: boolean;
  preserveTags?: string[];
  exclude?: NsiExclude;
}

/** A single NSI item representing a brand/operator/network/flag. */
export interface NsiItem extends HasLocationSet {
  id: string;
  displayName: string;
  tags: OsmTags;
  locationSet: LocationSet;
  matchNames?: string[];
  matchTags?: string[];
  preserveTags?: string[];
  fromTemplate?: boolean;
}

/** A template item that references a source category and generates concrete items. */
export interface NsiTemplateItem {
  templateSource: string;
  templateInclude?: string[];
  templateExclude?: string[];
  templateTags: OsmTags;
}

/** A category grouping items under a single {@link NsiPath}. */
export interface NsiCategory {
  properties: NsiCategoryProperties;
  items: NsiItem[];
  /**
   * Template items (only present in source data loaded via {@link fileTree.read}).
   * Absent in the published `nsi.json` and in caller-supplied data.
   */
  templates?: NsiTemplateItem[];
}

/** The full NSI dataset: an object keyed by {@link NsiPath}. */
export type NsiData = Record<NsiPath, NsiCategory>;

export interface NsiDissolved {
  dissolved: DissolvedMap;
}

export interface NsiPresets {
  presets: Record<string, IDPreset>;
}


//
// NSI Cache, used by FileTree to read/write the data.
//

/** The in-memory cache holding all NSI items and category data. */
export interface NsiCache {
  /** Map of item id → item object. */
  id: Map<string, NsiItem>;
  /** Object of {@link NsiPath} → category data. */
  path: Record<NsiPath, NsiCategory>;
}


//
// Match index types
//

/** The type of match a {@link MatchHit} represents. */
export type MatchHitType = 'primary' | 'alternate' | 'excludeGeneric' | 'excludeNamed';

/** A single match result returned by `Matcher.match()`. */
export interface MatchHit {
  match: MatchHitType;
  itemID?: string;
  area?: number;
  kv?: string;
  nsimple?: string;
  pattern?: string;
}

/** One branch of the match index (the data stored under a single `key/value` pair). */
export interface MatchIndexBranch {
  primary: Map<string, Set<string>>;        // nsimple → Set<itemID>
  alternate: Map<string, Set<string>>;      // nsimple → Set<itemID>
  excludeGeneric: Map<string, RegExp>;      // pattern string → RegExp
  excludeNamed: Map<string, RegExp>;        // pattern string → RegExp
}


//
// Wikidata / dissolution / warning types
//

/** A dissolution record for a Wikidata entity (company closed, merged, etc.). */
export interface WikidataDissolution {
  date: string;
  countries?: string[];
  /** QID of the entity that replaces this one, if any. */
  upgrade?: string;
}

/** Logo URLs collected for a Wikidata entity. */
export interface WikidataLogos {
  facebook?: string;
  twitter?: string;
  wikidata?: string;
}

/** Social-identity handles collected for a Wikidata entity. */
export interface WikidataIdentities {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  pinterest?: string;
  snapchat?: string;
  threads?: string;
  tiktok?: string;
  twitter?: string;
  vk?: string;
  website?: string;
  weibo?: string;
  weixin?: string;
  youtube?: string;
  youtubeHandle?: string;
}

/** Per-QID entry as written to `dist/wikidata/wikidata.json`. */
export interface WikidataEntry {
  label?: string;
  description?: string;
  logos?: WikidataLogos;
  identities?: WikidataIdentities;
  dissolutions?: WikidataDissolution[];
  officialWebsites?: string[];
  urlMatchPatterns?: string[];
  locationInfoWebsites?: string[];
}

/** Convenience alias for the inner map of {@link NsiWikidataJSON}, keyed by QID. */
export type WikidataMap = Record<string, WikidataEntry>;

/** Convenience alias for the inner map of {@link NsiDissolved}, keyed by NSI item id. */
export type DissolvedMap = Record<string, WikidataDissolution[]>;

/** A single warning entry written to `dist/wikidata/warnings.json`. */
export interface WikidataWarning {
  qid: string;
  msg: string;
}


//
// File shapes
// These describe the JSON files used by downsteam consumers (e.g. Rapid)
//

/** Top-level shape of `dist/nsi.json`. */
export interface NsiJSON {
  nsi: NsiData;
}

/** Top-level shape of `dist/trees.json`. */
export interface NsiTreesJSON {
  trees: Record<NsiTree, NsiTreeProperties>;
}

/** Top-level shape of `dist/matchGroups.json`. */
export interface NsiMatchGroupsJSON {
  matchGroups: Record<string, string[]>;
}

/** Top-level shape of `dist/genericWords.json`. */
export interface NsiGenericWordsJSON {
  genericWords: string[];
}

/** Top-level shape of `dist/replacements.json`. */
export interface NsiReplacementsJSON {
  replacements: Record<string, {
    note: string;
    wikidata: string;
  }>;
}

/** Top-level shape of `dist/wikidata/wikidata.json`. */
export interface NsiWikidataJSON {
  wikidata: WikidataMap;
}

/** Top-level shape of `dist/wikidata/warnings.json`. */
export interface NsiWarningsJSON {
  warnings: WikidataWarning[];
}


//
// Generated iD/Rapid Preset type
//

/**
 * Properties that define an iD/Rapid Preset.
 *
 * Note: `locationSet` and `matchScore` are NSI extensions — they are always
 * present on the presets that {@link buildIDPresets} generates, but the
 * source iD presets supplied as input do not have them.
 *
 * @see https://github.com/ideditor/schema-builder/blob/main/schemas/preset.json
 */
export interface IDPreset extends HasLocationSet {
  /** Display name */
  name: string;
  /** Region IDs where this preset is or isn't valid. See: https://github.com/ideditor/location-conflation */
  locationSet?: LocationSet;
  /** Name of preset icon which represents this preset */
  icon: string;
  /** Geometry types this Preset works with */
  geometry: string[];
  /** Score for ranking search results */
  matchScore?: number;
  /** URL of a remote image that is more specific than 'icon' */
  imageURL?: string;
  /** Alternate names that may be displayed in the UI */
  aliases?: string[];
  /** Related words used for searching */
  terms?: string[];
  /** Tags that identify this Preset */
  tags: OsmTags;
  /** Tags to add when applying this Preset */
  addTags?: OsmTags;
  /** Tags to remove when removing this Preset */
  removeTags?: OsmTags;
  /** Regexes to match tags that should be preserved - a validator should not try to replace these tags, see NSI#10083 */
  preserveTags?: string[];
  /** Field IDs for this Preset */
  fields?: string[];
  /** Additional Field IDs shown in "more fields" */
  moreFields?: string[];
  /** Whether this Preset appears in search results */
  searchable?: boolean;
  /** Reference data for documentation lookup */
  reference?: { key?: string; value?: string };
  /** The ID of a preset that is preferable to this one (for deprecated presets) */
  replacement?: string;
}


// Generated Taginfo file shapes
// See: https://wiki.openstreetmap.org/wiki/Taginfo/Projects

/** A single key/tag entry in the Taginfo data file. */
export interface TaginfoItem {
  /** OSM tag key (required). */
  key: string;
  /** OSM tag value. If omitted, means "all values" (optional). */
  value?: string;
  /** OSM object types this key/tag can be used for, e.g. `["node", "way", "relation"]` (optional). */
  object_types?: string[];
  /** How the key/tag is used in this project (optional). */
  description?: string;
  /** Link to further documentation for this specific key/tag (optional). */
  doc_url?: string;
  /** Icon URL, should work at 16×16 px on white/light-gray backgrounds (optional). */
  icon_url?: string;
}

/** Top-level shape of the generated `dist/taginfo.json` file. */
export interface TaginfoJSON {
  /** Data format version — always `1` (required). */
  data_format: 1;
  /** URL where this project file can be accessed (optional). */
  data_url?: string;
  /** Timestamp when the project file was last updated, `yyyymmddThhmmssZ` (optional). */
  data_updated?: string;
  /** Metadata about the project (required). */
  project: {
    /** Name of the project (required). */
    name: string;
    /** Short description of the project (required). */
    description: string;
    /** Home page of the project (required). */
    project_url: string;
    /** Documentation page for the tags used (optional). */
    doc_url?: string;
    /** Project logo URL, should work at 16×16 px on white/light-gray backgrounds (optional). */
    icon_url?: string;
    /** Contact name, required by the taginfo maintainer. */
    contact_name: string;
    /** Contact email, required by the taginfo maintainer. */
    contact_email: string;
  };
  /** List of keys and tags used by this project. */
  tags: TaginfoItem[];
}
