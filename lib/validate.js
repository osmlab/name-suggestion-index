const colors = require('colors/safe');
const Validator = require('jsonschema').Validator;

// Perform JSON Schema validation
module.exports = (fileName, object, schema) => {
    let v = new Validator();
    let validationErrors = v.validate(object, schema).errors;
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
};
