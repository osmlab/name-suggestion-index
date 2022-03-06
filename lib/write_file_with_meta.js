// External
import crypto from 'node:crypto';
import fs from 'node:fs';
import JSON5 from 'json5';

// JSON
import packageJSON from '../package.json' assert {type: 'json'};

const URLRoot = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main';

//
// This function is used to write files (probably to `/dist`)
// but with a block of metadata prepended to the beginning of the file.
//
// Accepts the same arguments that you'd pass to `fs.writeFileSync`
// `file` = the path to the file
// `contents` = should be stringified json containing an object {}
// `extra` = extra metadata properties to include
//
export function writeFileWithMeta(file, contents, extra) {
  // Load the previous file
  let previous = { _meta: { } };
  try {
    const contents = fs.readFileSync(file, 'utf8');
    previous = JSON5.parse(contents);
  } catch (err) { /* ignore */ }

  // Calculate md5 of new contents
  const message = packageJSON.version + contents;
  const hash = crypto.createHash('md5').update(message).digest('hex');
  const now = new Date();

  // If file has changed (or never existed), write a new one with metadata
  if (previous._meta.hash !== hash) {
    const meta = Object.assign({
      version: packageJSON.version,
      generated: now,
      url: `${URLRoot}/${file}`,
      hash: hash
    }, (extra || {}));

    // Stick metadata at the beginning of the file in the most hacky way possible
    const re = /\r?\n?[{}]\r?\n?/g;  // match curlies and their newline neighbors
    const strProps = JSON.stringify(meta, null, 4).replace(re, '');
    const block = `
  "_meta": {
${strProps}
  },`;

    fs.writeFileSync(file, contents.replace(/^\{/, '{' + block));
  }
}
