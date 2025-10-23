// External
import jsonschema from 'jsonschema';
import { styleText } from 'node:util';

// Perform JSON Schema validation
export function validate(fileName, object, schema) {
  const Validator = jsonschema.Validator;
  const v = new Validator();
  const validationErrors = v.validate(object, schema, { nestedErrors: true }).errors;
  if (validationErrors.length) {
    console.error(styleText('red', '\nError - Schema validation:'));
    console.error('  ' + styleText('yellow', fileName + ': '));
    validationErrors.forEach(e => {
      if (e.property) {
        console.error('  ' + styleText('yellow', e.property + ' ' + e.message));
        if (e.name === 'uniqueItems') {
          let arr  = e.instance;
          let duplicates = arr
            .map(n => n.displayName || n)
            .filter((e, i, a) => a.indexOf(e) !== i);
          console.error('  ' + styleText('yellow', JSON.stringify(duplicates)));
        }
      } else {
        console.error('  ' + styleText('yellow', e));
      }
    });
    console.error();
    process.exit(1);
  }
}
