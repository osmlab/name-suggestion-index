import { Glob } from 'bun';
import { styleText } from 'node:util';

const CDNRoot = 'https://purge.jsdelivr.net/npm/name-suggestion-index';
const packageJSON = await Bun.file('./package.json').json();

// Gather versions that need cache invalidation
const versions = ['@latest'];
const match = (packageJSON.version as string).match(/^(\d+)\.(\d+)/);
if (match?.[1]) {
  versions.push(`@${match[1]}`);   // major
  if (match[2]) {
    versions.push(`@${match[1]}.${match[2]}`);  // minor
  }
}


postpublish();

async function postpublish() {
  const START = '🏗   ' + styleText('yellow', 'Running postpublish…');
  const END = '👍  ' + styleText('green', 'postpublish done');

  console.log('');
  console.log(START);

  console.log(styleText('blueBright', 'Pausing 10 seconds…'));
  await Bun.sleep(10000);

  // Purge the JSDelivr CDN caches.
  // https://www.jsdelivr.com/documentation#id-purge-cache
  console.log('');
  console.log(styleText('blueBright', 'Purging JSDelivr caches…'));

  const promises: Promise<void>[] = [];
  const glob = new Glob('./dist/**/*');
  for (const filepath of glob.scanSync()) {
    // Keep just the end part of the path with extension, e.g. `dist/json/file.json`
    const path = filepath.replace(/(.*)(\/dist.*)/i, '$2');
    const paths = new Set([path]);

    // JSDelivr also serves a `.min.` variant (e.g. `file.js` -> `file.min.js`).
    // Purge both URLs so fresh content is visible regardless of which one users request.
    const match = path.match(/^(.*?)(\.[^./]+)$/);
    const base = match?.[1];
    const ext = match?.[2];
    if (base && ext && !base.endsWith('.min')) {
      paths.add(`${base}.min${ext}`);
    }

    for (const version of versions) {
      for (const pathToPurge of paths) {
        const url = `${CDNRoot}${version}${pathToPurge}`;
        const promise = fetch(url)
          .then(response => response.json() as Promise<{ status: string }>)
          .then(json => console.log(styleText('greenBright', `'${url}' → ${json.status}`)))
          .catch((err: unknown) => console.log(styleText('redBright', `'${url}' → ${err}`)));

        promises.push(promise);
      }
    }
  }

  await Promise.all(promises);
  console.log(END);
}

export { };
