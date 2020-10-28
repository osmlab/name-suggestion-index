[![Build Status](https://travis-ci.org/osmlab/name-suggestion-index.svg?branch=main)](https://travis-ci.org/osmlab/name-suggestion-index)
[![npm version](https://badge.fury.io/js/name-suggestion-index.svg)](https://badge.fury.io/js/name-suggestion-index)

## name-suggestion-index

Canonical features for OpenStreetMap

### What is it?

The goal of this project is to maintain a [canonical](https://en.wikipedia.org/wiki/Canonicalization)
list of commonly used features for suggesting consistent spelling and tagging in OpenStreetMap.

[Watch the video](https://2019.stateofthemap.us/program/sat/mapping-brands-with-the-name-suggestion-index.html) from our talk at State of the Map US 2019 to learn more about this project!

### Browse the index

You can browse the index at <https://nsi.guide/> to see which features are missing Wikidata links, or have incomplete Wikipedia pages.

### How it's used

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
- iD (see above)
- [Vespucci](http://vespucci.io/tutorials/name_suggestions/)
- [JOSM presets](https://josm.openstreetmap.de/wiki/Help/Preferences/Map#TaggingPresets) available
- [Osmose](http://osmose.openstreetmap.fr/en/errors/?item=3130)
- [Go Map!!](https://github.com/bryceco/GoMap), as they use iD presets

### Participate!

- Read the project [Code of Conduct](CODE_OF_CONDUCT.md) and remember to be nice to one another.
- See [CONTRIBUTING.md](CONTRIBUTING.md) for info about how to contribute to this index.

We're always looking for help!  If you have any questions or want to reach out to a maintainer, ping `bhousel` on:
- [OpenStreetMap US Slack](https://slack.openstreetmap.us/)
(`#poi` or `#general` channels)

### Prerequisites

- [Node.js](https://nodejs.org/) version 10 or newer
- [`git`](https://www.atlassian.com/git/tutorials/install-git/) for your platform

### Installing

- Clone this project, for example:
  `git clone git@github.com:osmlab/name-suggestion-index.git`
- `cd` into the project folder,
- Run `npm install` to install libraries

### About the index

#### Generated files (do not edit):

The files under `dist/*` are generated:
* `dist/collected/*` - Frequently occuring tags collected from OpenStreetMap
* `dist/filtered/*` - Subset of tags that we are keeping or discarding
* `dist/presets/*` - Preset files for use in OSM editors, custom JOSM presets, etc.
* `dist/taginfo.json` - List of all tags this project uses (see: https://taginfo.openstreetmap.org/)
* `dist/wikidata.json` - Cached data retrieved from Wikidata

#### Input files (edit these):

The files under `config/*`, `data/*`, and `features/*` can be edited:

* `config/*`:
  * `config/filter_*.json` - Regular expressions used to filter the OpenStreetMap tags into keep/discard lists
  * `config/match_groups.json` - Groups of OpenStreetMap tags that are considered equivalent for purposes of matching
* `data/*` - Data files for each kind of feature, organized by topic and OpenStreetMap tag
  * `data/brands/amenity/*.json`
  * `data/brands/shop/*.json`
  * `data/transit/route/*.json`
  * and so on…
* `features/*` - GeoJSON files that define custom regions where the features are allowed
  * `new_jersey.geojson`
  * `quebec.geojson`
  * and so on…

:point_right: See [CONTRIBUTING.md](CONTRIBUTING.md) for info about how to contribute to this index.

### Building the index

- `npm run build`
  - Processes any custom locations under `features/**/*.geojson`
  - Regenerates `dist/filtered/*` keep and discard lists
  - Any new items from the keep list not already present in the index will be merged into it
  - Outputs many warnings to suggest updates to `data/**/*.json`

### Building nsi.guide

<https://nsi.guide/> is a web application written in ReactJS that lets anyone browse the index.
* The source code for this app can be found under `app/*`
* `npm run appbuild` will rebuild it.

### Other commands

- `npm run wikidata` - Fetch useful data from Wikidata - labels, descriptions, logos, etc.
- `npm run dist` - Rebuild and minify the generated files in the `dist/` folder.
- `npm run` - Lists other available commands

### Collecting names from planet

This takes a long time and a lot of disk space. It can be done occasionally by project maintainers.
You do not need to do these steps in order to contribute to the index.

- Install `osmium` commandline tool and node package (may only be available on some environments)
  - `apt-get install osmium-tool` or `brew install osmium-tool` or similar
  - `npm install --no-save osmium`
- [Download the planet](http://planet.osm.org/pbf/)
  - `curl -L -o planet-latest.osm.pbf https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf`
- Prefilter the planet file to only include named items with keys we are looking for:
  - `osmium tags-filter planet-latest.osm.pbf -R name,brand,operator,network -o filtered.osm.pbf`
- Run `node scripts/collect_all.js /path/to/filtered.osm.pbf`
  - results will go in `dist/collected/*.json`
- A new challenge:
  - Attempt an `npm run build`.  Now that unique `id` properties are generated, it is possible that this command will fail.
  - This can happen if there are *multiple* new items that end up with the same `id` (e.g. "MetroBus" vs "Metrobus")
  - You'll need to just pick one to keep, then keep trying to run `npm run build` until the duplicate `id` issues are gone.
  - `git add . && git commit -m 'Collected common names from latest planet'`

### License

name-suggestion-index is available under the [3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause).
See the [LICENSE.md](LICENSE.md) file for more details.
