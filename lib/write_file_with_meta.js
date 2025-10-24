const packageJSON = await Bun.file('./package.json').json();
const URLRoot = 'https://raw.githubusercontent.com/osmlab/name-suggestion-index/main';

//
// This function is used to write files (probably to `/dist`)
//  but with a block of metadata prepended to the beginning of the file.
// @param  {string}  filepath - the path to the file we want to write
// @param  {string}  contents - should be stringified json containing an object {}
// @param  {OBject}  extra - optional extra metadata properties to include
//
export async function writeFileWithMeta(filepath, contents, extra = {}) {
  // Calculate md5 of contents
  const message = packageJSON.version + contents;
  const hash = new Bun.CryptoHasher('md5').update(message).digest('hex');
  const now = new Date();

  const path = filepath.replace(/^\.\//, '');  // remove leading './' if any
  const metadata = Object.assign({
    version: packageJSON.version,
    generated: now,
    url: `${URLRoot}/${path}`,
    hash: hash
  }, extra);

  // Stick metadata at the beginning of the file in the most hacky way possible
  const re = /\r?\n?[{}]\r?\n?/g;  // match curlies and their newline neighbors
  const strProps = JSON.stringify(metadata, null, 4).replace(re, '');
  const block = `
  "_meta": {
${strProps}
  },`;

  await Bun.write(filepath, contents.replace(/^\{/, '{' + block));
}
