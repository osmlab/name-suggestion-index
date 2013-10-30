var fs = require('fs'),
    find = require('findit'),
    mapping = require('./mapping.json'),
    raw = require('./topNames.json');

var clean = {};

for (var fullName in raw) {
    filterValues(fullName);
}

function filterValues(fullName) {
    fullName = fullName.split('|', 2);
    tag = fullName[0].split('/', 2);
    key = tag[0];
    value = tag[1];
    theName = fullName[1];
    if (mapping.wanted[key] &&
        mapping.wanted[key].indexOf(value) !== -1 &&
        mapping.discardedNames.indexOf(theName) == -1) {
        set(key, value, theName);
    }
}

function set(key, value, name) {
    if (!clean[key]) clean[key] = {};
    if (!clean[key][value]) clean[key][value] = {};
    if (!clean[key][value][name]) clean[key][value][name] = '';
}

function putAway(tag, name) {
    // put a value into the correct directory and file
    // we bulk everything up in order to sort it
    tag = tag.split('/', 2);
    console.log(tag);
}

console.log(clean);
