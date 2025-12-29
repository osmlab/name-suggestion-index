import { $, Glob } from 'bun';

$.nothrow();  // If a shell command returns nonzero, keep going.

// Remove these files if found anywhere
const files = [
  '.DS_Store',
  'npm-debug.log',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock'
];

for (const f of files) {
  const glob = new Glob(`**/${f}`);
  for await (const file of glob.scan({ dot: true })) {
    await $`rm -f ${file}`;
  }
}

// Remove these specific folders
// (skip `./dist/wikidata`, as these take a while to generate)
const folders = [
  './coverage',
  './dist/javascript',
  './dist/js',
  './dist/json',
  './dist/presets',
  './dist/ts'
];
for (const f of folders) {
  await $`rm -rf ${f}`;
}
