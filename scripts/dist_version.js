import { styleText } from 'bun:util';

const packageJSON = await Bun.file('package.json').json();

// YYYYMMDD
const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = ('0' + (now.getUTCMonth() + 1)).slice(-2);
const dd = ('0' + now.getUTCDate()).slice(-2);

const oldVersion = packageJSON.version;
const newVersion = oldVersion.replace(/(\d){8}/, `${yyyy}${mm}${dd}`);

if (newVersion !== oldVersion) {
  console.log('🎉  ' + styleText('green', 'Bumping package version to ') + styleText(['green','bold'], `v${newVersion}`));
  const output = Object.assign(packageJSON, { version: newVersion });
  await Bun.write('package.json', JSON.stringify(output, null, 2) + '\n');
}
