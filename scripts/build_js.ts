
await Promise.all([
   Bun.build({
    entrypoints: ['./nsiguide/index.jsx'],
    outdir: './dist/js',
    sourcemap: 'linked',
    naming: 'nsiguide.[ext]'  // .js
  }),

   Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist/js',
    target: 'browser',
    format: 'iife',
    sourcemap: 'linked',
    naming: 'nsi.iife.[ext]'  // .iife.js
  }),

  Bun.build({
    entrypoints: ['./src/nsi.ts'],
    outdir: './dist/js',
    target: 'node',
    format: 'cjs',
    external: ['diacritics', 'which-polygon'],
    sourcemap: 'linked',
    naming: 'nsi.c[ext]'  // .cjs
  }),

  Bun.build({
    entrypoints: ['./src/nsi.ts'],
    outdir: './dist/js',
    target: 'node',
    format: 'esm',
    external: ['diacritics', 'which-polygon'],
    sourcemap: 'linked',
    naming: 'nsi.m[ext]'  // .mjs
  })
]);
