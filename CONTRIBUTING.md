## Contributing

### tl;dr

##### :raising_hand: &nbsp; How to help:

* `npm run build` will reprocess the files and output warnings
* Edit `config/canonical.json` to resolve the warnings

##### :no_entry_sign: &nbsp; Don't edit the files in `dist/` - they are generated:

* `dist/allNames.json` - all the frequent names and tags collected from OpenStreetMap
* `dist/discardNames.json` - discarded subset of allNames
* `dist/keepNames.json` - kept subset of allNames

##### :white_check_mark: &nbsp; Do edit the files in `config/`:

* `config/filters.json`- Regular expressions used to filter `allNames` into `keepNames` / `discardNames`
* `config/canonical.json` - Main config file containing all the most correct names and tags to assign to them

&nbsp;

## Background

### :world_map: &nbsp; About OpenStreetMap

[OpenStreetMap](https://openstreetmap.org) is a free, editable map of the whole world that
is being built by volunteers.
Features on the map are defined using _tags_.  Each tag is a `key=value` pair of text strings.

For example, a McDonald's restaurant might have these tags:
```js
  "amenity": "fast_food"
  "cuisine": "burger"
  "name": "McDonald's"
  ... and more tags to record its address, opening hours, and so on.
```

&nbsp;

### :bulb: &nbsp; About the name-suggestion-index

The goal of this project is to define the _most correct tags_ to assign to each common brand name.
This helps people contribute to OpenStreetMap, because they can pick "McDonald's" from a list
and not need to worry about the tags being added.

&nbsp;

### :card_file_box: &nbsp; About `config/canonical.json`

__`config/canonical.json` is our main list of the most correct names and tags.__

This file is created by:
- Processing the OpenStreetMap "planet" data to extract common names -> `dist/allNames.json`
- Filtering all the names into -> `dist/keepNames.json` and `dist/discardNames.json`
- Merging the names we are keeping into -> `config/canonical.json` for us to decide what to do with them

Each entry looks like this:

```js
  "amenity/fast_food|McDonald's": {         // Identifier like "key/value|name"
    "count": 19040,                         // `count` - generated # of these that we found in OpenStreetMap
    "match": [
      "amenity/fast_food|Mc Donald's",      // Optional `match` array
      "amenity/fast_food|McDonalds",        //   Contains less-desirable variations to ignore.
      "amenity/restaurant|Mc Donald's",     //   (we want to keep only "amenity/fast_food|McDonald's")
      "amenity/restaurant|Mc Donalds",      //
      "amenity/restaurant|McDonald's",      //
      "amenity/restaurant|McDonalds",       //
    ],
    "tags": {                               // "tags" - OpenStreetMap tags that every McDonald's should have
      "amenity": "fast_food",               //   The OpenStreetMap tag for a "fast food" restaurant
      "brand": "McDonald's",                //   `brand` - Brand name in the local language (English)
      "brand:wikidata": "Q38076",           //   `brand:wikidata` - Universal Wikidata identifier
      "brand:wikipedia": "en:McDonald's",   //   `brand:wikipedia` - Reference to English Wikipedia
      "cuisine": "burger",                  //   `cuisine` - What kind of fast food is served here
      "name": "McDonald's"                  //   `name` - Display name, also in the local language (English)
    }
  },
```

There may also be entries for McDonald's in other languages!

```js
  "amenity/fast_food|マクドナルド": {         // Identifier like "key/value|name"
    "count": 1445,
    "countryCodes": ["jp"],                 // Optional `countryCodes` - array of countries where this entry is used
    "tags": {
      "amenity": "fast_food",
      "brand": "マクドナルド",                // `brand` - Brand name in the local language (Japanese)
      "brand:en": "McDonald's",             // `brand:en` - For non-English brands, tag the English version too
      "brand:wikidata": "Q38076",           // `brand:wikidata` - Same Universal wikidata identifier
      "brand:wikipedia": "ja:マクドナルド",   // `brand:wikipedia` - Reference to Japanese Wikipedia
      "cuisine": "burger",
      "name": "マクドナルド",                 // `name` - Display name, also in the local language (Japanese)
      "name:en": "McDonald's"               // `name:en` - For non-English names, tag the English version too
    }
  },
```

Other optional properties to suppress warnings:

* __`nomatch`__ - Array of other keys which should be considered __different__ from this entry.
* __`nocount`__ - Set to `true` if this entry is not found in `keepNames`

&nbsp;

## What you can do

### :building_construction: &nbsp; Building the project

To rebuild the index, run:
* `npm run build`

This will output a lot of warnings, which you can help fix!

&nbsp;

### :thinking: &nbsp; Resolving warnings

Warnings mean that you need to edit `config/canonical.json`.
The warning output gives a clue about how to fix or suppress the warning.
If you aren't sure, just ask on GitHub!

##### Duplicate names

```
Warning - Potential duplicate names in `canonical.json`:
To resolve these, remove the worse entry and add "match" property on the better entry.
To suppress this warning for entries that really are different, add a "nomatch" property on both entries.
  "tourism/motel|Motel 6" -> duplicates? -> "tourism/hotel|Motel 6"
```

What it means:  "Motel 6" exists in the index twice - as both a `tourism=hotel` (wrong)
and a `tourism=motel` (correct). In this situation we want to:
* Delete the entry for 'tourism/hotel|Motel 6' and
* Add `"match": ["tourism/hotel|Motel 6"]` to the `"tourism/motel|Motel 6"` entry

Usually the entry which is used more frequently (indicated by "count" property)
is the one to keep.  If you are not sure, you can also search on the
[OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Map_Features) for tag best practices.


##### Uncommon names

```
Warning - Uncommon entries in `canonical.json` not found in `keepNames.json`:
These might be okay. It just means that the entry is not commonly found in OpenStreetMap.
To suppress this warning, add a "nocount" property to the entry.
  "shop/wholesale|Costco"
```

This warning can occur if the index contains an entry that is not common in OpenStreetMap.
Either replace it with a more common tag, or add `"nocount": true` to suppress the warning.
(In this situation, `shop=wholesale` is a new preferred tag, but most existing Costcos were
still tagged as `shop=department_store`. Suppressing the warning is the correct thing to do).
