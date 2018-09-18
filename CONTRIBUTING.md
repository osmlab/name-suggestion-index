## Contributing

Everything under `config/` you can edit:

* `config/filters.json`- Regular expressions used to filter `allNames` into `keepNames` / `discardNames`
* `config/canonical.json` - The main config file containing all the most correct names and tags to assign to them

Everything under `dist/` you should not edit:

* `dist/allNames.json` - all the frequent names and tags collected from OpenStreetMap
* `dist/discardNames.json` - discarded subset of allNames
* `dist/keepNames.json` - kept subset of allNames


### `config/filters.json`

These are regular expressions used to filter the `allNames` into `keepNames` / `discardNames` lists.


### `config/canonical.json`

Entries look like this.
The "key" is in the format `key/value|name`.

```js
  "amenity/fast_food|McDonald's": {
    "count": 19040,
    "match": [
      "amenity/fast_food|Mc Donald's",
      "amenity/fast_food|McDonalds",
      "amenity/restaurant|Mc Donald's",
      "amenity/restaurant|Mc Donalds",
      "amenity/restaurant|McDonald's",
      "amenity/restaurant|McDonalds",
    ],
    "tags": {
      "amenity": "fast_food",
      "brand": "McDonald's",
      "cuisine": "burger",
      "name": "McDonald's"
    }
  },
```

Here are the properties that an entry can contain:

* __`count`__ - (generated), if the entry is found in `keepNames` the `count` will be filled in.
* __`countryCodes`__ - (optional) Array of [two letter country codes](https://en.wikipedia.org/wiki/ISO_31661#Current_codes) where this name is used
* __`match`__ - Array of alternate keys which should be considered __the same__ as this entry.
* __`tags`__ - The OpenStreetMap tags that should be set on the entry.
  * "brand" - brand name, in the local language
  * "brand:en" - (optional) brand name in English (if the `brand` is not in English)
  * "brand:wikidata" - Wikidata id
  * "brand:wikipedia" - Wikipedia page for the brand
  * "name" - The name of the feature
  * "operator" - (optional) - add this if the brand operates all of its stores

Properties to suppress warnings:
* __`nomatch`__ - Array of other keys which should be considered __different__ from this entry.
* __`nocount`__ - Set to `true` if this entry is not found in `keepNames`


### Building

* Just `npm run filterNames`
  * This will check the files for errors and make them pretty.

