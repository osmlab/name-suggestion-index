// External
import chalk from 'chalk';
import jsonschema from 'jsonschema';

// Perform JSON Schema validation
export function validate(fileName, object, schema) {
  const Validator = jsonschema.Validator;
  const v = new Validator();
  const validationErrors = v.validate(object, schema, { nestedErrors: true }).errors;
  if (validationErrors.length) {
    console.error(chalk.red('\nError - Schema validation:'));
    console.error('  ' + chalk.yellow(fileName + ': '));
    validationErrors.forEach(e => {
      if (e.property) {
        console.error('  ' + chalk.yellow(e.property + ' ' + e.message));
        if (e.name === 'uniqueItems') {
          let arr  = e.instance;
          let duplicates = arr
            .map(n => n.displayName || n)
            .filter((e, i, a) => a.indexOf(e) !== i);
          console.error('  ' + chalk.yellow(JSON.stringify(duplicates)));
        }
      } else {
        console.error('  ' + chalk.yellow(e));
      }
    });
    console.error();
    process.exit(1);
  }
}
