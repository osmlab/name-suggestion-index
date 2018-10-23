const colors = require('colors/safe');
const Validator = require('jsonschema').Validator;

const filters = require('./config/filters.json');
const canonical = require('./config/canonical.json');
const filtersSchema = require('./schema/filters.json');
const canonicalSchema = require('./schema/canonical.json');

validateSchema('config/filters.json', filters, filtersSchema);
validateSchema('config/canonical.json', canonical, canonicalSchema);

// Perform JSON Schema validation
function validateSchema(fileName, object, schema) {
    const v = new Validator();
    const validationErrors = v.validate(object, schema).errors;
    if (validationErrors.length) {
        console.error(colors.red('\nError - Schema validation:'));
        console.error('  ' + colors.yellow(fileName + ': '));
        validationErrors.forEach(e => {
            if (e.property) {
                console.error('  ' + colors.yellow(e.property + ' ' + e.message));
            } else {
                console.error('  ' + colors.yellow(e));
            }
        });
        console.error();
        process.exit(1);
    }
}
