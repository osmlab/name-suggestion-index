const colors = require('colors/safe');
const fs = require('fs');
const packageJSON = require('../package.json');

// YYYYMMDD
const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = ('0' + (now.getUTCMonth() + 1)).slice(-2);
const dd = ('0' + now.getUTCDate()).slice(-2);

const oldVersion = packageJSON.version;
const newVersion = oldVersion.replace(/(\d){8}/, `${yyyy}${mm}${dd}`);

if (newVersion !== oldVersion) {
  console.log('🎉  ' + colors.green('Bumping package version to ') + colors.green.bold(newVersion));
  const output = Object.assign(packageJSON, { version: newVersion });
  fs.writeFileSync('package.json', JSON.stringify(output, null, 2));
}
