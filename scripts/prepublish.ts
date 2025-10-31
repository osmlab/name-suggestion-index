import { Glob } from 'bun';
import { styleText } from 'bun:util';

const CDNRoot = 'https://cdn.jsdelivr.net/npm/name-suggestion-index';
const packageJSON = await Bun.file('./package.json').json();

// Fallback to @latest, but try for a better major/minor version
let version = '@latest';
const match = packageJSON.version.match(/^(\d+)\.(\d+)/);
if (match[1]) {
  version = `@${match[1]}`;   // major
  if (match[2]) {
    version = `@${match[1]}.${match[2]}`;  // minor
  }
}


prepublish();

async function prepublish() {
  const START = '🏗   ' + styleText('yellow', 'Running prepublish…');
  const END = '👍  ' + styleText('green', 'prepublish done');

  console.log('');
  console.log(START);
  console.time(END);

  const promises = [];
  const glob = new Glob('./dist/**/*.json');
  for (const filepath of glob.scanSync()) {
    if (/\.min\.json$/.test(filepath)) continue;  // but not .min.json

    await metadataJSON(filepath);
    await minifyJSON(filepath);
  }

  console.timeEnd(END);
}


/**
 * metadataJSON
 * This function adds a block of metadata to the beginning of a `.json` file.
 * @param  {string}  filepath - the path to the file we want to add metadata to
 */
async function metadataJSON(filepath) {
  const file = Bun.file(filepath);
  const contents = (await file.text()) || '';

  if (contents[0] !== '{') {
    throw new Error(`No JSON: ${filepath}`);

  } else if (!/\"_meta\":/.test(contents)) {  // if not done already
    // Keep just the end part of the path without extension, e.g. `dist/json/file.json`
    const path = filepath.replace(/(.*)(\/dist.*)/i, '$2');

    // Calculate md5 of contents
    const message = packageJSON.version + contents;
    const hash = new Bun.CryptoHasher('md5').update(message).digest('hex');
    const now = new Date();

    const metadata = {
      version:    packageJSON.version,
      generated:  now,
      url:       `${CDNRoot}${version}${path}`,
      hash:      hash
    };

    // Stick metadata at the beginning of the file in the most hacky way possible
    const re = /\r?\n?[{}]\r?\n?/g;  // match curlies and their newline neighbors
    const strProps = JSON.stringify(metadata, null, 4).replace(re, '');
    const block = `
  "_meta": {
${strProps}
  },`;

    console.log(styleText('greenBright', filepath));
    await Bun.write(file, contents.replace(/^\{/, '{' + block));
  }
}


/**
 * minifyJSON
 * This function creates a minified `.min.json` file in the same place as an original `.json` file.
 *
 * JSDelivr CDN does not yet have automatic support for serving `.min.json`.
 * We can watch this issue to see if they add it:  https://github.com/jsdelivr/jsdelivr/issues/18604
 * Then maybe remove this code.
 *
 * @param  {string}  filepath - the path to the file we want to minify
 */
async function minifyJSON(filepath) {
  const outPath = filepath.replace('.json', '.min.json');
  const contents = await Bun.file(filepath).json();

  console.log(styleText('greenBright', outpath));
  await Bun.write(outPath, JSON.stringify(contents));
}
