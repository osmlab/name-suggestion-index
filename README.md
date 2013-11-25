# Name Suggestion Index

The goal of this project is to maintain a canonical list of commonly used name 
values for suggesting correct spelling and/or formatting that might otherwise 
diverge from common usage on OSM. When editing a place name like `Walmart`, users 
create many different spellings such as `Wal-Mart`, `WalMart`, `Walmart Supercenter`. 
In [iD](http://github.com/systemed/iD) we want to help suggest the most common names 
with the correct formatting and spelling.

This index can also be used for passing additional values for a selected name. 
For example, it's known that McDonald's serves hamburgers so we can use that knowledge to
fill in `cuisine=burger` or any other tags that are always associated with a specific name.

###Contributing
We need help finding all the 'incorrect' names in `topNames.json` and mapping them to the 
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

- make necessary changes to `canonical.json` or `filter.json` ("what to edit" below)
- run `make`
    - this will run `build.js` against `topNames.json` using the rules defined in `filter.json` 
    and `canonical.json`
    - `name-suggestions.json` and `name-suggestions.min.json` will be updated

###What to edit
- `canonical.json` is a list of the most correct names, any possible similar matches 
to them, and any known tags.
- `filter.json` determines which tag combinations are included and which names are 
completely ignored
- `name-suggestions.json` and `name-suggestions.min.json` are compiled, any changes made to them 
directly will be overwritten

###Updating topNames.json from planet
- `git clone https://github.com/osmlab/name-suggestion-index.git && cd name-suggestion-index`
- [download the planet](http://planet.osm.org/pbf/)
- Ubuntu install:
    - `apt-get update`
    - `apt-get -y install python-dev python-pip build-essential libprotobuf-dev protobuf-compiler`
    - `pip install imposm.parser`
- `python getRaw.py yourOSMfile`
    - results will go to `topNames.json`
