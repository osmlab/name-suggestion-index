[![Build Status](https://travis-ci.org/osmlab/name-suggestion-index.svg?branch=master)](https://travis-ci.org/osmlab/name-suggestion-index)
[![npm version](https://badge.fury.io/js/name-suggestion-index.svg)](https://badge.fury.io/js/name-suggestion-index)

## name-suggestion-index

Canonical common brand names for OpenStreetMap


### What is it?

The goal of this project is to maintain a [canonical](https://en.wikipedia.org/wiki/Canonicalization)
list of commonly used names for suggesting consistent spelling and tagging of features
in OpenStreetMap.


### How it's used

When mappers create features in OpenStreetMap, they are not always consistent about how they
name and tag things. For example, we may prefer `McDonald's` tagged as `amenity=fast_food`
but we see many examples of other spellings (`Mc Donald's`, `McDonalds`, `McDonald’s`) and
taggings (`amenity=restaurant`).

Building a canonical name index allows two very useful things:
- We can suggest the most "correct" way to tag things as users create them while editing.
- We can scan the OSM data for "incorrect" features and produce lists for review and cleanup.

<img width="1017px" alt="Name Suggestion Index in use in iD" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/nsi-in-iD.gif"/>

*The name-suggestion-index is in use in iD when adding a new item*

Currently used in:
* iD (see above)
* [Vespucci](http://vespucci.io/tutorials/name_suggestions/)
* JOSM presets available


### Browse the index

You can browse the index at
http://osmlab.github.io/name-suggestion-index/brands/index.html
to see which brands are missing Wikidata links, or have incomplete Wikipedia pages.


### Participate!

* Read the project [Code of Conduct](CODE_OF_CONDUCT.md) and remember to be nice to one another.
* See [CONTRIBUTING.md](CONTRIBUTING.md) for info about how to contribute to this index.

We're always looking for help!  If you have any questions or want to reach out to a maintainer, ping `bhousel` on:
* [OpenStreetMap US Slack](https://slack.openstreetmap.us/)
(`#poi` or `#general` channels)


### Prerequisites

* [Node.js](https://nodejs.org/) version 6 or newer
* [`git`](https://www.atlassian.com/git/tutorials/install-git/) for your platform


### Installing

* Clone this project, for example:
  `git clone git@github.com:osmlab/name-suggestion-index.git`
* `cd` into the project folder,
* Run `npm install` to install libraries


### About the index

#### Generated files (do not edit):

Preset files (used by OSM editors):
* `dist/name-suggestions.json` - Name suggestion presets
* `dist/name-suggestions.min.json` - Name suggestion presets, minified
* `dist/name-suggestions.presets.xml` - Name suggestion presets, as JOSM-style preset XML

Name lists:
* `dist/names_all.json` - all the frequent names and tags collected from OpenStreetMap
* `dist/names_discard.json` - subset of `names_all` we are discarding
* `dist/names_keep.json` - subset of `names_all` we are keeping
* `dist/wikidata.json` - cached brand data retrieved from Wikidata

#### Configuration files (edit these):

* `config/*`
  * `config/filters.json`- Regular expressions used to filter `names_all` into `names_keep` / `discardNames`
* `brands/*` - Config files for each kind of branded business, organized by OpenStreetMap tag
  * `brands/amenity/*.json`
  * `brands/leisure/*.json`
  * `brands/shop/*.json`
  * `brands/tourism/*.json`

:point_right: See [CONTRIBUTING.md](CONTRIBUTING.md) for info about how to contribute to this index.


### Building the index

* `npm run build`
  * Regenerates `dist/names_keep.json` and `dist/names_discard.json`
  * Any new entries from `names_keep` not already present in the index will be added to it
  * Outputs many warnings to suggest updates to `brands/**/*.json`


### Other commands

* `npm run wikidata` - Fetch useful data from Wikidata - labels, descriptions, logos, etc.
* `npm run docs` - Updates the index summary pages
* `npm run` - Lists other available tools

### Updating `dist/names_all.json` from planet

This takes a long time and a lot of disk space. It can be done occasionally by project maintainers.
You do not need to do these steps in order to contribute to the index.

- Install `osmium` commandline tool and node package globally (may only work on some environments)
  - `apt-get install osmium-tool` or `brew install osmium-tool` or similar
  - `npm install -g osmium`
- [Download the planet](http://planet.osm.org/pbf/)
  - `curl -o planet-latest.osm.pbf https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf`
- Prefilter the planet file to only include named items with keys we are looking for:
  - `osmium tags-filter planet-latest.osm.pbf -R name -o named.osm.pbf`
  - `osmium tags-filter named.osm.pbf -R amenity,shop,leisure,tourism,office -o wanted.osm.pbf`
- Run `node build_all_names wanted.osm.pbf`
  - results will go in `dist/names_all.json`
  - `git add dist/names_all.json && git commit -m 'Updated dist/names_all.json'`


### License

name-suggestion-index is available under the [3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause).
See the [LICENSE.md](LICENSE.md) file for more details.
