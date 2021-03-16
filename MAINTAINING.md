# Info for Maintainers

This file contains useful information for maintainers.
You don't need to know any of this if you just want to contribute to the index!

- [Prerequisites](#prerequisites)
- [Project Setup](#project-setup)
- [Building the index](#building-the-index)
- [Syncing with Wikidata](#syncing-with-wikidata)
- [Releasing](#releasing)
- [Building nsi.guide](#building-nsiguide)
- [Other commands](#other-commands)
- [Collecting names from the OSM planet](#collecting-names-from-the-osm-planet)


## Prerequisites

- [Node.js](https://nodejs.org/) version 10 or newer
- [`git`](https://www.atlassian.com/git/tutorials/install-git/) for your platform


## Project Setup

#### Installing

- Clone this project, for example:
  `git clone git@github.com:osmlab/name-suggestion-index.git`
- `cd` into the project folder,
- Run `npm install` to install libraries

#### Updates

- `git pull origin --rebase` is a good way to keep your local copy of the code updated
- rerun `npm install` whenever dependencies are updated in `package.json`


## Building the index

- `npm run build`
  - Takes a few seconds and should be run whenever the `data/*` or `config/*` files change
  - Processes custom locations under `features/**/*.geojson` into `dist/featureCollection.json`
  - Sorts `dist/collected/*` name lists into `dist/filtered/*` "keep" and "discard" name lists
  - Merges new items found in the "keep" lists into the `data/*` files
  - Generates ids
  - Outputs warnings to suggest updates to `data/**/*.json`
  - Make sure to check in code when done, with something like `git add . && git commit -m 'npm run build'`


## Syncing with Wikidata

- `npm run wikidata`
  - Takes about 15 minutes and should be run occasionally to keep NSI in sync with Wikidata
  - Fetches related Wikidata names, descriptions, logos, then updates `dist/wikidata.json`
  - Updates the Wikidata pages to contain the current NSI identifiers
  - Outputs warnings to suggest fixes on Wikidata for missing social accounts, or other common errors
  - Make sure to check in code when done, with something like `git add . && git commit -m 'npm run wikidata'`
  - (We may try to automate more of this eventually)


## Releasing

- `npm run dist`
  - Takes a few seconds and builds all the files in `dist/*`
  - The semantic version number of the project is updated automatically:
  `major.minor.patch` where patch is the date in `yyyymmdd` format
  - Rebuilds iD and JOSM presets, taginfo file, other output files
  - Should be run whenever the index is in a good state (build and wikidata sync has happened successfully)
  - Make sure to check in code when done, with something like `git add . && git commit -m 'npm run dist'`
  - Projects which pull NSI data from GitHub (such as <https://nsi.guide/>) will appear updated soon after `npm run dist`
  - Other downstream projects may pull from `dist/*` too

To publish an official release, follow the steps in [RELEASE.md](RELEASE.md).
  - Official releases are stable forever and available via NPM or on CDNs like JSDelivr
  - Projects which pull name-suggestion-index from NPM or a CDN (sucn as iD) will appear updated soon after publishing
  - Publishing the code to NPM requires rights to run `npm publish`


## Building nsi.guide

<https://nsi.guide/> is a web application written in ReactJS that lets anyone browse the index.

- `npm run appbuild`
  - Rebuilds the ReactJS code for <https://nsi.guide/>
  - The source code for this app can be found under `app/*`
  - Only need to rebuild this when the app code changes, not when the index changes


## Other commands

- `npm run lint` - Checks the Javascript code for correctness
- `npm run test` - Runs tests agains the Javascript code
- `npm run` - Lists other available commands


## Collecting names from the OSM planet

This takes a long time and a lot of disk space. It can be done occasionally by project maintainers.

- Install `osmium` command-line tool and node package (may only be available on some environments)
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
