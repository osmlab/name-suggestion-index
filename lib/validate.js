const colors = require('colors/safe');
const Validator = require('jsonschema').Validator;

// Perform JSON Schema validation
module.exports = (fileName, object, schema) => {
  const v = new Validator();
  const validationErrors = v.validate(object, schema, { nestedErrors: true }).errors;
  if (validationErrors.length) {
    console.error(colors.red('\nError - Schema validation:'));
    console.error('  ' + colors.yellow(fileName + ': '));
    validationErrors.forEach(e => {
      if (e.property) {
        console.error('  ' + colors.yellow(e.property + ' ' + e.message));
        if (e.name === 'uniqueItems') {
          let arr  = e.instance;
          let duplicates = arr.filter((e, i, a) => a.indexOf(e) !== i);
          console.error('  ' + colors.yellow(JSON.stringify(duplicates)));
        }
      } else {
        console.error('  ' + colors.yellow(e));
      }
    });
    console.error();
    process.exit(1);
  }
};