## Contributing

:no_entry_sign: Don't edit the files in `dist/` - they are generated:

* `dist/allNames.json` - all the frequent names and tags collected from OpenStreetMap
* `dist/discardNames.json` - discarded subset of allNames
* `dist/keepNames.json` - kept subset of allNames

:white_check_mark: Do edit the files in `config/`:

* `config/filters.json`- Regular expressions used to filter `allNames` into `keepNames` / `discardNames`
* `config/canonical.json` - Main config file containing all the most correct names and tags to assign to them


### About OpenStreetMap

[OpenStreetMap](https://openstreetmap.org) is a free, editable map of the whole world that
is being built by volunteers.

Features on the map are defined using `tags`.  Each tag is a `key: value` pair of text strings.

For example, a McDonald's restaurant might have these tags:
* `amenity: fast_food`
* `name: McDonald's`
* ... and more tags to record its address, opening hours, and so on.


### About the name-suggestion-index

The goal of this project is to define the _most correct tags_ to assign to each common brand name.
This helps people contribute to OpenStreetMap, because they can pick "McDonald's" from a list
and not need to worry about the tags being added.

:point_right: `config/canonical.json` is our list of brand names and tags.

This file is created by:
- Processing the OpenStreetMap "planet" data to extract common names -> `dist/allNames.json`
- Filtering all the names into -> `dist/keepNames.json` and `dist/discardNames.json`
- Merging the names we are keeping into -> `config/canonical.json` for us to decide what to do with them


### About `config/canonical.json`

Each entry looks like this:

```js
  "amenity/fast_food|McDonald's": {         // Each entry has an identifier like "key/value|name"
    "count": 19040,                         // "count" contains the number of these we found in OpenStreetMap
    "match": [
      "amenity/fast_food|Mc Donald's",      // Optional "match" array contains alternative
      "amenity/fast_food|McDonalds",        //   less desirable tag-name combinations
      "amenity/restaurant|Mc Donald's",
      "amenity/restaurant|Mc Donalds",      // For example, we prefer the name "McDonald's" and for it to be
      "amenity/restaurant|McDonald's",      //   tagged with `amenity/fast_food` over `amenity/restaurant`
      "amenity/restaurant|McDonalds",
    ],
    "tags": {                               // Required "tags" - OpenStreetMap tags that the item should have.
      "amenity": "fast_food",
      "brand": "McDonald's",                // "brand" - in the local language, in this case English
      "brand:wikidata": "Q38076",           // "brand:wikidata" - Universal Wikidata identifier
      "brand:wikipedia": "en:McDonald's",   // "brand:wikipedia" - reference to English Wikipedia
      "cuisine": "burger",                  // "cuisine" - says what kind of fast food is served here
      "name": "McDonald's"                  // "name" - display name, also in the local language English
    }
  },
```

There may also be entries for McDonald's in other languages!:

```js
  "amenity/fast_food|マクドナルド": {         // Each entry has an identifier like "key/value|name"
    "count": 1445,
    "countryCodes": ["jp"],                 // Optional "countryCodes": array of countries where this entry is valid
    "tags": {
      "amenity": "fast_food",
      "brand": "マクドナルド",                // "brand" - in the local language, in this case Japanese
      "brand:en": "McDonald's",             // "brand:en" - we can tag the English version too
      "brand:wikidata": "Q38076",           // "brand:wikidata" - same Universal wikidata identifier
      "brand:wikipedia": "ja:マクドナルド",   // "brand:wikipedia" - Reference to Japanese Wikipedia
      "cuisine": "burger",
      "name": "マクドナルド",                 // "name" - in the local language, in this case Japanese
      "name:en": "McDonald's"               // "name:en" - we can tag the English version too
    }
  },
```


Properties to suppress warnings:
* __`nomatch`__ - Array of other keys which should be considered __different__ from this entry.
* __`nocount`__ - Set to `true` if this entry is not found in `keepNames`


### Building

* `npm run filterNames`

