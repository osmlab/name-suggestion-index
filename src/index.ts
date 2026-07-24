import * as nsi from './nsi.ts';

declare global {
  // biome-ignore lint/style/noNamespace: extending globalThis
  namespace globalThis {
    var nsi: typeof import('./nsi');
  }
}

globalThis.nsi = nsi;
