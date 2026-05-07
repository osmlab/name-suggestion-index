import * as nsi from './nsi.ts';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace globalThis {
    // eslint-disable-next-line no-var
    var nsi: typeof import('./nsi');
  }
}

globalThis.nsi = nsi;
