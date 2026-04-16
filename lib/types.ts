import type { LocationSet } from '@rapideditor/location-conflation';


/** Tags must always consist of key,value string pairs (no undefined) */
export type OsmTags = Record<string, string>;


// NSI Cache, used by FileTree to read/write the data.

/** The in-memory cache holding all NSI items and category data. */
export interface NsiCache {
  /** Map of item id → item object. */
  id: Map<string, NsiItem>;
  /** Object of `tree/key/value` paths → category data. */
  path: Record<string, NsiCategory>;
}


// NSI core data structure types

/** The four NSI tree categories. */
export type NsiTree = 'brands' | 'operators' | 'transit' | 'flags';

/** Tree configuration as defined in `config/trees.json`. */
export interface NsiTreeConfig {
  emoji: string;
  mainTag: string;
  sourceTags?: string[];
  nameTags: {
    primary: string;    // regex pattern string
    alternate: string;  // regex pattern string
  };
}

/** Category-level exclusion patterns (regex strings matched against names). */
export interface NsiExclude {
  generic?: string[];
  named?: string[];
}

/** Properties for a category (one `tree/key/value` path). */
export interface NsiCategoryProperties {
  path: string;
  skipCollection?: boolean;
  preserveTags?: string[];
  exclude: NsiExclude;
}

/** A single NSI item representing a brand/operator/transit network/flag. */
export interface NsiItem {
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

/** A category grouping items under a single `tree/key/value` path. */
export interface NsiCategory {
  properties: NsiCategoryProperties;
  items: NsiItem[];
  templates: NsiTemplateItem[];
}

/** The full NSI dataset: an object keyed by `tree/key/value` path. */
export type NsiData = Record<string, NsiCategory>;


// Match index types

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


// Config types

/** Top-level shape of `config/trees.json`. */
export interface TreesConfig {
  trees: Record<NsiTree, NsiTreeConfig>;
}

/** Top-level shape of `config/matchGroups.json`. */
export interface MatchGroupsConfig {
  matchGroups: Record<string, string[]>;
}

/** Top-level shape of `config/genericWords.json`. */
export interface GenericWordsConfig {
  genericWords: string[];
}

/** Top-level shape of `config/replacements.json`. */
export interface ReplacementsConfig {
  replacements: Record<string, {
    note: string;
    wikidata: string;
  }>;
}


// Wikidata / dissolution types

/** A dissolution record for a Wikidata entity (company closed, merged, etc.). */
export interface Dissolution {
  date: string;
  countries?: string[];
  upgrade?: string;
}


// Preset type, used by `dist.ts`
/**
 * Properties that define a Rapid/iD Preset.
 * @see https://github.com/ideditor/schema-builder/blob/main/schemas/preset.json
 */
export interface RapidPreset {
  /** Display name */
  name: string;
  /** Region IDs where this preset is or isn't valid. See: https://github.com/ideditor/location-conflation */
  locationSet: LocationSet;
  /** Name of preset icon which represents this preset */
  icon: string;
  /** Geometry types this Preset works with */
  geometry: string[];
  /** Score for ranking search results */
  matchScore: number;
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
