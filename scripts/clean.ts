import { $, Glob } from 'bun';

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
const folders = [
  './coverage',
  './dist/javascript'
];
for (const f of folders) {
  await $`rm -rf ${f}`;
}
