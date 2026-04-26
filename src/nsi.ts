export { Matcher } from '../lib/matcher.ts';
export { simplify } from '../lib/simplify.ts';
export { stemmer } from '../lib/stemmer.ts';
export { buildIDPresets } from '../lib/presets_id.ts';
export { buildJOSMPresets } from '../lib/presets_josm.ts';

export type {
  BuildIDPresetsOptions,
  BuildIDPresetsResult
} from '../lib/presets_id.ts';

export type {
  BuildJOSMPresetsOptions
} from '../lib/presets_josm.ts';

export * from '../lib/types.ts';
