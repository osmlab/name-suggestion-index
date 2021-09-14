const colors = require('colors/safe.js');
const shell = require('shelljs');

console.log('🏗   ' + colors.yellow('Setting up your environment to use osmium...'));

// backup
shell.config.verbose = true;
shell.exec('git update-index --skip-worktree package.json');
shell.exec('git update-index --skip-worktree .npmrc');
shell.mv('-f', 'package.json', 'package.json.backup');
shell.mv('-f', '.npmrc', '.npmrc.backup');

// use osmium specfic project config
shell.cp('-f', 'package-osmium.json', 'package.json');

// wipe dependencies
shell.rm('-rf', 'package-lock.json', 'node_modules');

console.log('');
console.log('We think working with a prebuilt osmium might require Node 10 or lower. ');
console.log('Please switch to it now and reinstall dependencies, for example: ');
console.log('  nvm use 10');
console.log('  npm install');
console.log('');

console.log('👍  ' + colors.green('done - good luck!'));
