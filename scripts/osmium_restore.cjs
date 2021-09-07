const colors = require('colors/safe.js');
const shell = require('shelljs');

console.log('🏗   ' + colors.yellow('Restoring environment...'));

// restore from backups
shell.config.verbose = true;
shell.mv('-f', 'package.json.backup', 'package.json');
shell.mv('-f', '.npmrc.backup', '.npmrc');
shell.exec('git update-index --no-skip-worktree package.json');
shell.exec('git update-index --no-skip-worktree .npmrc');

// wipe dependencies
shell.rm('-rf', 'package-lock.json', 'node_modules');

console.log('');
console.log('Now return to your preferred node and reinstall dependencies, for example: ');
console.log('  nvm use 16');
console.log('  npm install');
console.log('');

console.log('👍  ' + colors.green('done - good luck!'));
