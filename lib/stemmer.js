const simplify = require('./simplify.js');

// Removes noise from the name so that we can compare
// similar names for catching duplicates.
module.exports = (name) => {
  const noise = [
    /ban(k|c)(a|o)?/ig,
    /банк/ig,
    /coop/ig,
    /express/ig,
    /(gas|fuel)/ig,
    /wireless/ig,
    /(shop|store)/ig
  ];

  name = noise.reduce((acc, regex) => acc.replace(regex, ''), name);
  return simplify(name);
};
