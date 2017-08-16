var fs = require("fs"),
    xmlbuilder = require('xmlbuilder')
    suggest = require('./name-suggestions.json');

var presets=xmlbuilder.create('presets', {version: '1.0', encoding: 'UTF-8'})
  .att('xmlns', 'http://josm.openstreetmap.de/tagging-preset-1.0')
  .att('author', 'Name Suggestion Index');
var topgroup=presets.ele('group').att('name','Name Suggestion Index');

// for each name in name-suggestions.json, create a one-click
// JOSM preset using the key and value structure from the json
// to organize the presets into JOSM preset groups.
for (key in suggest){
    var keygroup=topgroup.ele('group').att('name',key);
    for (value in suggest[key]){
        if(Object.keys(suggest[key][value]).length > 0){
            var valuegroup=keygroup.ele('group').att('name',value);
            for (name in suggest[key][value]){
                var item=valuegroup.ele('item')
                  .att('name', name);
                item.ele('key').att('key',key).att('value',value);
                item.ele('key').att('key','name').att('value',name);
                var thisname=suggest[key][value][name];
                if ('tags' in thisname){
                    for (k in thisname['tags']){
                        item.ele('key').att('key',k).att('value',thisname['tags'][k]);
                    }
                }
            }
        }
    }
}

var xmlstring=presets.end({ pretty: true })
fs.writeFileSync('name-suggestions.presets.xml', xmlstring);