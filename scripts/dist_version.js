// External
import chalk from 'chalk';
import fs from 'node:fs';

// JSON
import packageJSON from '../package.json' assert {type: 'json'};

// YYYYMMDD
const now = new Date();
const yyyy = now.getUTCFullYear();
const mm = ('0' + (now.getUTCMonth() + 1)).slice(-2);
const dd = ('0' + now.getUTCDate()).slice(-2);

const oldVersion = packageJSON.version;
const newVersion = oldVersion.replace(/(\d){8}/, `${yyyy}${mm}${dd}`);

if (newVersion !== oldVersion) {
  console.log('🎉  ' + chalk.green('Bumping package version to ') + chalk.green.bold(`v${newVersion}`));
  const output = Object.assign(packageJSON, { version: newVersion });
  fs.writeFileSync('package.json', JSON.stringify(output, null, 2) + '\n');
}
