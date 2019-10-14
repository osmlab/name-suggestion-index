var simplify = require('./simplify.js');

// Removes noise from the name so that we can compare
// similar names for catching duplicates.
module.exports = function stemmer(name) {
    const noise = [
        /ban(k|c)(a|o)?/ig,
        /банк/ig,
        /coop/ig,
        /express/ig,
        /(gas|fuel)/ig,
        /wireless/ig,
        /(shop|store)/ig
    ];

    name = noise.reduce(function(acc, regex) { return acc.replace(regex, ''); }, name);
    return simplify(name);
};
