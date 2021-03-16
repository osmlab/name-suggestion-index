# Info for Developers

This file contains useful information for developers who want to use the name-suggestion-index in another project.

- [Distributed files](#distributed-files)
- [Downloading the data](#downloading-the-data)
- [API Reference](#api-reference)


## Distributed Files

The files under `dist/*` are generated:
- `nsi.json` - The complete index
- `dissolved.json` - List of items that we believe may be dissolved based on Wikidata claims
- `featureCollection.json` - A GeoJSON FeatureCollection containing all the custom features (geofences)
- `taginfo.json` - List of all tags this project supports (see: https://taginfo.openstreetmap.org/)
- `wikidata.json` - Cached data retrieved from Wikidata (names, social accounts, logos)
- `collected/*` - Frequently occuring name tags collected from OpenStreetMap
- `filtered/*` - Subset of name tags that we are keeping or discarding
- `presets/*` - Preset files generated for iD and JOSM editors

These files from the `config/` folder are also copied over to the `dist/` folder:
- `genericWords.json` - Regular expressions to match generic names (e.g. "store", "noname")
- `matchGroups.json` - Groups of OpenStreetMap tags that are considered equivalent for purposes of matching
- `replacements.json` - Mapping of old Wikidata QIDs to replacement new Wikidata/Wikipedia values
- `trees.json` - Metadata about subtrees supported in this project


Each file is available in both regular `.json` or minified `.min.json` format.


### Metadata

Each JSON file contains a block of metadata like:
```js
"_meta": {
  "version": "5.0.20210315",
  "generated": "2021-03-15T18:21:03.025Z",
  "url": "https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist/featureCollection.json",
  "hash": "c215297c0b7292e4c2c3033ec534d411"
}
```

- `version` - the semantic version of project when the file was generated:
  `major.minor.patch` where patch is the date in `yyyymmdd` format
- `generated` - the date that the file was generated
- `url` - source url where the file is available
- `hash` - MD5 hash of the file


## Downloading the data

You can download the files from the index directly from GitHub or use a CDN.


### Latest published release (stable forever):

Direct from GitHub <sub><sup>([docs](https://stackoverflow.com/questions/39065921/what-do-raw-githubusercontent-com-urls-represent))</sup></sub>:
```js
https://raw.githubusercontent.com/osmlab/name-suggestion-index/{branch or tag}/{path to file}
https://raw.githubusercontent.com/osmlab/name-suggestion-index/v5.0.20210315/dist/name-suggestions.presets.min.xml
```

Via JSDelivr CDN <sub><sup>([docs](https://www.jsdelivr.com/))</sup></sub>:
```js
https://cdn.jsdelivr.net/npm/name-suggestion-index@{semver}/{path to file}
https://cdn.jsdelivr.net/npm/name-suggestion-index@5.0/dist/name-suggestions.presets.min.xml
```


### Current development version (breaks sometimes!):

Direct from GitHub <sub><sup>([docs](https://stackoverflow.com/questions/39065921/what-do-raw-githubusercontent-com-urls-represent))</sup></sub>:
```js
https://raw.githubusercontent.com/osmlab/name-suggestion-index/{branch or tag}/{path to file}
https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/dist/presets/nsi-josm-presets.min.xml
```

Via JSDelivr CDN <sub><sup>([docs](https://www.jsdelivr.com/?docs=gh))</sup></sub>:
```js
https://cdn.jsdelivr.net/gh/name-suggestion-index@{branch or tag}/{path to file}
https://cdn.jsdelivr.net/gh/osmlab/name-suggestion-index@main/dist/presets/nsi-josm-presets.min.xml
```


## API Reference

Some of the JavaScript code is available in both ES6 module (.mjs) and CommonJS (.js) formats.

More info soon.

