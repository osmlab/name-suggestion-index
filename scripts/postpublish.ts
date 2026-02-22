import { Glob } from 'bun';
import { styleText } from 'bun:util';

const CDNRoot = 'https://purge.jsdelivr.net/npm/name-suggestion-index';
const packageJSON = await Bun.file('./package.json').json();

// Gather versions that need cache invalidation
const versions = ['@latest'];
const match = packageJSON.version.match(/^(\d+)\.(\d+)/);
if (match[1]) {
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

  const promises = [];
  const glob = new Glob('./dist/**/*');
  for (const filepath of glob.scanSync()) {
    // Keep just the end part of the path without extension, e.g. `dist/json/file.json`
    const path = filepath.replace(/(.*)(\/dist.*)/i, '$2');

    for (const version of versions) {
      const url = `${CDNRoot}${version}${path}`;
      const promise = fetch(url)
        .then(response => response.json())
        .then(json => console.log(styleText('greenBright', `'${url}' → ${json.status}`)))
        .catch(err => console.log(styleText('redBright', `'${url}' → ${err}`)));

      promises.push(promise);
    }
  }

  await Promise.all(promises);
  console.log(END);
}
