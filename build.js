const colors = require('colors/safe');
const fs = require('fs');
const shell = require('shelljs');
const stringify = require('json-stringify-pretty-compact');

const filter = require('./filter.json');
const topNames = require('./topNames.json');
const canonical = require('./canonical.json');
const correctNames = buildReverseIndex(canonical);

var out = {};
var defined = {};

buildAll();


function buildAll() {
    console.log('building data');
    console.time(colors.green('data built'));

    // Start clean
    shell.rm('-f', ['dist/name-suggestions.*']);

    // convert discardedNames to lowerCase as we compare against
    // lowerCase later on and as changing case is locale specific
    // converting in code will at least use the same locale
    var len = filter.discardedNamesOverall.length;
    for (var i = 0; i < len; i++) {
        filter.discardedNamesOverall[i] = filter.discardedNamesOverall[i].toLowerCase();
    }

    for (var fullName in topNames) {
        filterValues(fullName);
    }

    // Save individual data files
    fs.writeFileSync('dist/name-suggestions.json', prettyStringify({ names: out }));
    fs.writeFileSync('dist/name-suggestions.min.json', JSON.stringify({ names: out }));

    console.timeEnd(colors.green('data built'));
}


function buildReverseIndex(canonical) {
    var rIndex = {};
    for (var can in canonical) {
        if (canonical[can].matches) {
            for (var i = canonical[can].matches.length - 1; i >= 0; i--) {
                var match = canonical[can].matches[i];
                rIndex[match] = can;
            }
        }
    }
    return rIndex;
}

function filterValues(fullName) {
    var theName = fullName.split('|', 2);
    var tag = theName[0].split('/', 2);
    var key = tag[0];
    var value = tag[1];

    theName = theName[1];
    var theNameLower = theName.toLowerCase();
    if (filter.wanted[key] &&
        filter.wanted[key].indexOf(value) !== -1 &&
        filter.discardedNamesOverall.indexOf(theNameLower) == -1) {
        var len = filter.discardPatterns.length;
        for (var i = 0; i < len; i++) { // maybe this should use regexps
            if (theName.indexOf(filter.discardPatterns[i])>-1) return;
        }
        // discard any object specific names we don't want
        if (filter.discardedNames[key] && filter.discardedNames[key][value]) {
            var toDiscard = filter.discardedNames[key][value];
            len = toDiscard.length;
            for (var i = 0; i < len; i++) {
              if (theNameLower===toDiscard[i]) return;
            }
        }
        //
        if (correctNames[theName]) theName = correctNames[theName];
        set(key, value, theName, topNames[fullName]);
    }
}

function set(k, v, name, count) {
    if (!out[k]) out[k] = {};
    if (!out[k][v]) out[k][v] = {};
    if (!out[k][v][name]) {
        if (canonical[name] && canonical[name].nix_value) {
            for (var i = 0; i < canonical[name].nix_value.length; i++) {
                if (canonical[name].nix_value[i] == v) return;
            }
        }

        if (defined[name]) {
            var string = name;
            for (var i = 0; i < defined[name].length; i++) {
                string += '\n\t in ' + defined[name][i] + ' - ';
                var kv = defined[name][i].split('/');
                string += out[kv[0]][kv[1]][name].count + ' times';
            }
            console.log(string + '\n\t and ' + k + '/' + v + ' - ' + count + ' times');
        }

        out[k][v][name] = { count: count };
        if (defined[name]) {
            defined[name].push(k + '/' + v);
        } else {
            defined[name] = [k + '/' + v];
        }
    } else {
        out[k][v][name].count += count;
    }

    if (canonical[name]) {
        for (var tag in canonical[name].tags) {
            if (!out[k][v][name].tags) out[k][v][name].tags = {};
            out[k][v][name].tags[tag] = canonical[name].tags[tag];
        }
    }
}
