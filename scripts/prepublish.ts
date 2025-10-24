// External
import { Glob } from 'bun';
import stringify from '@aitodotai/json-stringify-pretty-compact';
import { styleText } from 'bun:util';

// Internal
import { writeFileWithMeta } from '../lib/write_file_with_meta.js';


prepublish();

async function prepublish() {
  const START = '🏗   ' + styleText('yellow', 'Running prepublish…');
  const END = '👍  ' + styleText('green', 'prepublish done');

  console.log('');
  console.log(START);
  console.time(END);

  // Refresh the files already in `./dist/json/*`, update metadata to match current version and time.
  const completeJSON = await Bun.file('./dist/json/completeFeatureCollection.json').json();
  const featuresJSON = await Bun.file('./dist/json/featureCollection.json').json();
  const resourcesJSON = await Bun.file('./dist/json/resources.json').json();
  const defaultsJSON = await Bun.file('./dist/json/defaults.json').json();

  delete completeJSON._meta;
  delete featuresJSON._meta;
  delete resourcesJSON._meta;
  delete defaultsJSON._meta;

  await writeFileWithMeta('./dist/json/completeFeatureCollection.json', stringify(completeJSON) + '\n');
  await writeFileWithMeta('./dist/json/defaults.json', stringify(defaultsJSON) + '\n');
  await writeFileWithMeta('./dist/json/featureCollection.json', stringify(featuresJSON, { maxLength: 9999 }) + '\n');
  await writeFileWithMeta('./dist/json/resources.json', stringify(resourcesJSON, { maxLength: 9999 }) + '\n');

  // Minify the .json files under `./dist/json/*`
  // JSDelivr CDN does not yet have automatic support for serving `.min.json`.
  // We can watch this issue to see if they add it:  https://github.com/jsdelivr/jsdelivr/issues/18604
  // Then maybe remove this code.
  const glob = new Glob('./dist/json/*.json');
  for (const filepath of glob.scanSync()) {
    await minifyJSON(filepath, filepath.replace('.json', '.min.json'));
  }

  console.timeEnd(END);
}


// minifyJSON
// minifies a JSON file
async function minifyJSON(inPath, outPath) {
  try {
    const contents = await Bun.file(inPath).json();
    const minified = JSON.stringify(contents);
    await Bun.write(outPath, minified);
  } catch (err) {
    console.error(styleText('red', `Error - ${err.message} minifying:`));
    console.error(styleText('yellow', '  ' + inPath));
    process.exit(1);
  }
}


