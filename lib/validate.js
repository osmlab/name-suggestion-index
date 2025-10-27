import { styleText } from 'bun:util';

// Perform JSON Schema validation
export function validate(validator, filepath, object, schema) {

  const validationErrors = validator.validate(object, schema, { nestedErrors: true }).errors;
  if (validationErrors.length) {
    console.error(styleText('red', '\nError - Schema validation:'));
    console.error('  ' + styleText('yellow', filepath + ': '));
    for (const e of validationErrors) {
      if (e.property) {
        console.error('  ' + styleText('yellow', e.property + ' ' + e.message));
        if (e.name === 'uniqueItems') {
          const arr  = e.instance;
          const duplicates = arr
            .map(n => n.displayName || n)
            .filter((e, i, a) => a.indexOf(e) !== i);
          console.error('  ' + styleText('yellow', JSON.stringify(duplicates)));
        }
      } else {
        console.error('  ' + styleText('yellow', e));
      }
    }
    console.error();
    process.exit(1);
  }
}
