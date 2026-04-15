import { styleText } from 'node:util';
import type { Validator, Schema } from 'jsonschema';


/**
 * Validates an object against a JSON Schema and exits the process on failure.
 *
 * If validation errors are found, they are printed to stderr in red/yellow
 * and the process exits with code 1.  For `uniqueItems` violations the
 * duplicate values are also printed.
 *
 * @param   validator - A `jsonschema` Validator instance
 * @param   filepath  - The file path being validated (used in error output)
 * @param   object    - The value to validate
 * @param   schema    - The JSON Schema to validate against
 * @throws  Terminates the process via `process.exit(1)` when validation fails.
 */
export function validate(validator: Validator, filepath: string, object: unknown, schema: Schema): void {
  const validationErrors = validator.validate(object, schema, { nestedErrors: true }).errors;
  if (validationErrors.length) {
    console.error(styleText('red', '\nError - Schema validation:'));
    console.error('  ' + styleText('yellow', filepath + ': '));
    for (const e of validationErrors) {
      if (e.property) {
        console.error('  ' + styleText('yellow', e.property + ' ' + e.message));
        if (e.name === 'uniqueItems') {
          const arr: any[]  = e.instance;
          const duplicates = arr
            .map(n => n.displayName || n)
            .filter((e, i, a) => a.indexOf(e) !== i);
          console.error('  ' + styleText('yellow', JSON.stringify(duplicates)));
        }
      } else {
        console.error('  ' + styleText('yellow', String(e)));
      }
    }
    console.error();
    process.exit(1);
  }
}
