[![build](https://github.com/osmlab/name-suggestion-index/workflows/build/badge.svg)](https://github.com/osmlab/name-suggestion-index/actions?query=workflow%3A%22build%22)
[![npm version](https://badge.fury.io/js/name-suggestion-index.svg)](https://badge.fury.io/js/name-suggestion-index)

# name-suggestion-index (aka "NSI")

Canonical features for OpenStreetMap


## What is it?

The goal of this project is to maintain a [canonical](https://en.wikipedia.org/wiki/Canonicalization)
list of commonly used features for suggesting consistent spelling and tagging in OpenStreetMap.

[Watch the video](https://2019.stateofthemap.us/program/sat/mapping-brands-with-the-name-suggestion-index.html) from our talk at State of the Map US 2019 to learn more about this project!


## Browse the index

👉 You can browse the index at <https://nsi.guide/>.


## How it's used

When mappers create features in OpenStreetMap, they are not always consistent about how they
name and tag things. For example, we may prefer `McDonald's` tagged as `amenity=fast_food`
but we see many examples of other spellings (`Mc Donald's`, `McDonalds`, `McDonald’s`) and
taggings (`amenity=restaurant`).

Building a canonical feature index allows two very useful things:

- We can suggest the most "correct" way to tag things as users create them while editing.
- We can scan the OSM data for "incorrect" features and produce lists for review and cleanup.

<img width="1017px" alt="Name Suggestion Index in use in iD" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/nsi-in-iD.gif"/>

*The name-suggestion-index is in use in iD when adding a new item*

Currently used in:
- [iD](https://github.com/openstreetmap/iD) (see above)
- [Vespucci](http://vespucci.io/tutorials/name_suggestions/)
- [JOSM presets](https://josm.openstreetmap.de/wiki/Help/Preferences/Map#TaggingPresets) available
- [Osmose](http://osmose.openstreetmap.fr/en/errors/?item=3130)
- [osmfeatures](https://github.com/westnordost/osmfeatures)
- [Go Map!!](https://github.com/bryceco/GoMap)


## About the index

You can learn more from these pages:
- <https://nsi.guide/> - Browse and search all the data
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute data about brands, transit, and other features to this index
- [DEVELOPING.md](DEVELOPING.md) - If you are a developer and want to use the name-suggestion-index in your project
- [MAINTAINING.md](MAINTAINING.md) - How to setup and build the index, sync with wikidata, and make releases


### Source files (edit these):

The files under `config/*`, `data/*`, and `features/*` may be edited:

- `data/*` - Data files for each feature category, organized by topic and OpenStreetMap tag
  - `brands/**/*.json`
  - `flags/**/*.json`
  - `operators/**/*.json`
  - `transit/**/*.json`

- `features/*` - GeoJSON files that define custom regions (aka [geofences](https://en.wikipedia.org/wiki/Geo-fence))
  - `us/new_jersey.geojson`
  - `ca/quebec.geojson`
  - and so on…

- `config/*`
  - `genericWords.json` - Regular expressions to match generic names (e.g. "store", "noname")
  - `matchGroups.json` - Groups of OpenStreetMap tags that are considered equivalent for purposes of matching
  - `replacements.json` - Mapping of old Wikidata QIDs to replacement new Wikidata/Wikipedia values
  - `trees.json` - Metadata about subtrees supported in this project


### Generated files (do not edit):

The files under `dist/*` are generated.
See [DEVELOPING.md](DEVELOPING.md) for info about the generated files.


## Participate!

- Read the project [Code of Conduct](CODE_OF_CONDUCT.md) and remember to be nice to one another.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for info about how to contribute to this index.

We're always looking for help!  If you have any questions or want to reach out to a maintainer,
ping `bhousel`,  `1ec5`, or `tas50` on:
- [OpenStreetMap US Slack](https://slack.openstreetmap.us/) (`#poi` or `#general` channels)


## License

name-suggestion-index is available under the [3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause).
See the [LICENSE.md](LICENSE.md) file for more details.
