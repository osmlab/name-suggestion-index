# Name Suggestion Index

The goal of this project is to maintain a canonical list of commonly used names
for suggesting correct spelling or formatting that might otherwise diverge from
common usage on OSM. When editing a place name like `Walmart`, users have created
many different spellings such as `Wal-Mart`, `WalMart`, `Walmart Supercenter`.
In [iD](https://github.com/openstreetmap/iD) we want to help suggest the most common names
with the correct formatting and spelling.

![name-suggestion-index in use in iD](http://i.imgur.com/9p1E6S4.gif)

*The name-suggestion-index is in use in iD whenever searching entering a new item via the sidebar*

This index can also be used for passing additional values for a selected name.
For example, it's known that McDonald's serves hamburgers so we can use that knowledge to
fill in `cuisine=burger` or other tags that are always associated with a specific name.

name-suggestion-index is also [used by Vespucci](http://vespucci.io/tutorials/name_suggestions/).

### Contributing
We need help finding all the 'incorrect' names in `allNames.json` and mapping them to the
correct equivalent so the incorrect name is not suggested. By 'correct', we only mean
the most common usage on OSM. Check with `filter.json` to make sure we are using that
tag combination and are not ignoring that name already. For example, "Papa John's" has
been used 144 times, but has also been entered as "Papa John's Pizza" (62) and
"Papa Johns" (68). Mapping them to a singular value is done in `canonical.json`:

    "Papa John's": {
        "matches": [
            "Papa John's Pizza",
            "Papa Johns"
        ]
    }

In some cases it is preferable to discard data known to be incorrrect - for
example, to discard McDonald's tagged as restaurants from further processing:

    "McDonald's":{
        "nix_value":[
            "restaurant"
        ]
    },

may be used. It ensures that McDonald's will not become listed as a possible restaurant name.

- make necessary changes to `canonical.json` or `filter.json` ("what to edit" below)
- run `make`
    - this will run `build.js` against `allNames.json` using the rules defined in `filter.json`
    and `canonical.json`
    - `name-suggestions.json` and `name-suggestions.min.json` will be updated

### What to edit
- `config/canonical.json` is a list of the most correct names, any possible similar matches
to them, and any known tags.
- `config/filter.json` determines which tag combinations are included and which names are
completely ignored
- `dist/name-suggestions.json` and `dist/name-suggestions.min.json` are compiled, any changes made to them
directly will be overwritten

### Installation
- `git clone https://github.com/osmlab/name-suggestion-index.git && cd name-suggestion-index`
- Ubuntu install (install recent nodejs):
    - `sudo apt-get update`
    - `sudo apt-get install -y python-software-properties python g++ make`
    - `sudo apt-get install nodejs npm`
    - `sudo ln -s /usr/bin/nodejs /usr/bin/node`
    - `npm install`

### Updating `allNames.json` from planet
- Install osmium commandline tool
    `apt-get install osmium-tool` or `brew install osmium-tool` or similar
- [Download the planet](http://planet.osm.org/pbf/)
    `curl -o planet-latest.osm.pbf https://planet.openstreetmap.org/pbf/planet-latest.osm.pbf`
- Prefilter the planet file to only include named items with keys we are looking for:
    `osmium tags-filter planet-latest.osm.pbf -R name -o named.osm.pbf`
    `osmium tags-filter named.osm.pbf -R amenity,shop,leisure,man_made,tourism -o wanted.osm.pbf`
- Run `node build_allNames wanted.osm.pbf`
    - results will go in `dist/allNames.json`
