
await Promise.all([
   Bun.build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist/javascript',
    target: 'browser',
    format: 'iife',
    sourcemap: 'linked',
    naming: 'nsi.iife.[ext]'  // .iife.js
  }),

  Bun.build({
    entrypoints: ['./src/nsi.mjs'],
    outdir: './dist/javascript',
    target: 'node',
    format: 'cjs',
    external: ['*'],
    sourcemap: 'linked',
    naming: 'nsi.c[ext]'  // .cjs
  }),

  Bun.build({
    entrypoints: ['./src/nsi.mjs'],
    outdir: './dist/javascript',
    target: 'node',
    format: 'esm',
    external: ['*'],
    sourcemap: 'linked',
    naming: 'nsi.m[ext]'  // .mjs
  })
]);
