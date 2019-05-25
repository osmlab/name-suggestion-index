## Contributing

### tl;dr

##### :raising_hand: &nbsp; How to help:

* `npm run build` will reprocess the files and output warnings
* Resolve warnings - [show me](#thinking--resolve-warnings)
* Remove generic names - [show me](#hocho--remove-generic-names)
* Add `brand:wikidata` and `brand:wikipedia` tags - [show me](#female_detective--add-wiki-tags)
* Add missing brands - [show me](#convenience_store--add-missing-brands)
* Edit Wikidata - [show me](#memo--edit-wikidata)

Tip: You can browse the index at
[http://osmlab.github.io/name-suggestion-index/brands/index.html](http://osmlab.github.io/name-suggestion-index/brands/index.html)
to see which brands are missing Wikidata links, or have incomplete Wikipedia pages.


##### :no_entry_sign: &nbsp; Don't edit the files in `dist/` - they are generated:

* `dist/names_all.json` - all the frequent names and tags collected from OpenStreetMap
* `dist/names_discard.json` - subset of `names_all` we are discarding
* `dist/names_keep.json` - subset of `names_all` we are keeping
* `dist/wikidata.json` - cached brand data retrieved from Wikidata

##### :white_check_mark: &nbsp; Do edit the files in `config/` and `brands/`:

* `config/*`
  * `config/filters.json`- Regular expressions used to filter `names_all` into `names_keep` / `names_discard`
  * `config/match_groups.json`- Groups of tag pairs that are considered equal when matching
* `brands/*` - Config files for each kind of branded business, organized by OpenStreetMap tag
  * `brands/amenity/*.json`
  * `brands/leisure/*.json`
  * `brands/shop/*.json`
  * `brands/tourism/*.json`

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

### :card_file_box: &nbsp; About the brand files

__The `brands/*` folder contains many files, which together define the most correct OpenStreetMap names and tags.__

These files are created by a several step process:
- Process the OpenStreetMap "planet" data to extract common names -> `dist/names_all.json`
- Filter all the names into -> `dist/names_keep.json` and `dist/names_discard.json`
- Merge the names we are keeping into -> `brands/**/*.json` files for us to decide what to do with them

The files are organized by OpenStreetMap tag:
* `brands/*` - Config files for each kind of branded business, organized by OpenStreetMap tag
  * `brands/amenity/*.json`
  * `brands/leisure/*.json`
  * `brands/shop/*.json`
  * `brands/tourism/*.json`


Each brand entry looks like this _(comments added for clarity)_:

In `brands/amenity/fast_food.json`:

```js
  "amenity/fast_food|McDonald's": {         // Identifier like "key/value|name"
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
    "countryCodes": ["jp"],                 // Optional `countryCodes` - array of countries where this entry is used
    "tags": {
      "amenity": "fast_food",
      "brand": "マクドナルド",                // `brand` - Brand name in the local language (Japanese)
      "brand:en": "McDonald's",             // `brand:en` - For non-English brands, tag the English version too
      "brand:ja": "マクドナルド",             // `brand:ja` - Add at least one `brand:xx` tag that matches `brand`
      "brand:wikidata": "Q38076",           // `brand:wikidata` - Same Universal wikidata identifier
      "brand:wikipedia": "ja:マクドナルド",   // `brand:wikipedia` - Reference to Japanese Wikipedia
      "cuisine": "burger",
      "name": "マクドナルド",                 // `name` - Display name, also in the local language (Japanese)
      "name:en": "McDonald's"               // `name:en` - For non-English names, tag the English version too
      "name:ja": "マクドナルド",              // `name:ja` - Add at least one `name:xx` tag that matches `name`
    }
  },
```

&nbsp;

#### Optional properties

##### `matchNames`/`matchTags`

Sometimes a single brand will have different tags in OpenStreetMap.

For example, we prefer "Bed Bath & Beyond" to be tagged as `shop/houseware`.
However we also need to recognize:
- less-preferred name spellings like "Bed Bath and Beyond"
- less-preferred tag pairs like `shop/department_store`

Rather than adding every possible alternative to the index, we can use
`matchNames` and `matchTags` properties to ignore less-preferred alternatives.

```js
  "shop/houseware|Bed Bath & Beyond": {
    "matchNames": ["bed bath and beyond"],     // also match these alternate spellings
    "matchTags": ["shop/department_store"],    // also match these alternate taggings
    "tags": {
      "brand": "Bed Bath & Beyond",
      "brand:wikidata": "Q813782",
      "brand:wikipedia": "en:Bed Bath & Beyond",
      "name": "Bed Bath & Beyond",
      "shop": "houseware"
    }
  },
```

The matching code also has some useful automatic behaviors:

- Names are always matched case insensitive, with spaces and punctuation removed.
You do not need to add `matchNames` properties for simple name variations.

- Some tags are assigned to _match groups_ (defined in `config/match_groups.json`).
You don't need add `matchTags: ["shop/doityourself"]` to every "shop/hardware"
and vice versa. Tags in a match group will match any other tags in the same match group.


##### `nomatch`

Sometimes there are multiple _different_ entries that use the same name.

For example, "Sonic" can be either a fast food restaurant or a fuel station.

We want to allow both kinds of "Sonic" to exist in the index, and we don't want
to be warned that they are potentially duplicate, so we can add a `nomatch`
property to each entry to suppress the "duplicate name" warning.

```js
  "amenity/fuel|Sonic": {
    "nomatch": ["amenity/fast_food|Sonic"],
    ...
  },
  "amenity/fast_food|Sonic": {
    "nomatch": ["amenity/fuel|Sonic"],
    ...
  },
```

&nbsp;


#### Identical names, multiple brands

Sometimes multiple brands with the same name will operate in geographically
distinct locations.  You can modify the key to include a tilde `~` after the name
to tell the difference between two otherwise identical brands.
The text after the tilde can contain anything.

When using a tilde `~` name:
* You should add `"nomatch":` properties to each name so they do not generate duplicate name warnings.


```js
  "shop/supermarket|Price Chopper~(Kansas City)": {
    "countryCodes": ["us"],
    "nomatch": [
      "shop/supermarket|Price Chopper~(New York)"
    ],
    "tags": {
      "brand": "Price Chopper",
      "brand:wikidata": "Q7242572",
      "brand:wikipedia": "en:Price Chopper (supermarket)",
      "name": "Price Chopper",
      "shop": "supermarket"
    }
  },
  "shop/supermarket|Price Chopper~(New York)": {
    "countryCodes": ["us"],
    "nomatch": [
      "shop/supermarket|Price Chopper~(Kansas City)"
    ],
    "tags": {
      "brand": "Price Chopper",
      "brand:wikidata": "Q7242574",
      "brand:wikipedia": "en:Price Chopper Supermarkets",
      "name": "Price Chopper",
      "shop": "supermarket"
    }
  },
```


&nbsp;

## What you can do

### :building_construction: &nbsp; Building the project

To rebuild the index, run:
* `npm run build`

This will output a lot of warnings, which you can help fix!

&nbsp;

### :thinking: &nbsp; Resolve warnings

Warnings mean that you need to edit files under `brands/*`.
The warning output gives a clue about how to fix or suppress the warning.
If you aren't sure, just ask on GitHub!

&nbsp;

#### Duplicate names

```
Warning - Potential duplicate brand names:
To resolve these, remove the worse entry and add "matchNames"/"matchTags" properties on the better entry.
To suppress this warning for entries that really are different, add a "nomatch" property on both entries.
  "shop/supermarket|Carrefour" -> duplicates? -> "amenity/fuel|Carrefour"
  "shop/supermarket|VinMart" -> duplicates? -> "shop/department_store|VinMart"
```

_What it means:_  These names are commonly tagged differently in OpenStreetMap.  This might be ok, but it might be a mistake.

For "VinMart" we really prefer for it to be tagged as a supermarket.  It's a single brand frequently mistagged.
* Add `"matchTags": ["shop/department_store"]` to the (preferred) `"shop/supermarket|VinMart"` entry
* Delete the (not preferred) entry for `"shop/department_store|VinMart"`

For "Carrefour" we know that can be both a supermarket and a fuel station.  It's two different things.
* Add `"nomatch": ["shop/supermarket|Carrefour"]` to the `"amenity/fuel|Carrefour"` entry
* Add `"nomatch": ["amenity/fuel|Carrefour"]` to the `"shop/supermarket|Carrefour"` entry

Existing tagging (you can compare counts in `dist/names_keep.json`), information at the relevant Wikipedia page or the company's website, and [OpenStreetMap Wiki tag documentation](https://wiki.openstreetmap.org/wiki/Map_Features) all help in deciding whether to match or nomatch these duplicates.

If the situation is unclear, one may contact the [local community](https://community.osm.be/) and ask for help.

&nbsp;

### :hocho: &nbsp; Remove generic names

Some of the common names in the index might not actually be brand names. We want to remove these
generic words from the index, so they are not suggested to mappers.

For example, "Универмаг" is just a Russian word for "Department store":

```js
  "shop/department_store|Универмаг": {
    "tags": {
      "brand": "Универмаг",
      "name": "Универмаг",
      "shop": "department_store"
    }
  },
```

To remove this generic name:
1. Delete the item from the appropriate file, in this case `brands/shop/department_store.json`
2. Edit `config/filters.json`. Add a regular expression matching the generic name in either the `discardKeys` or `discardNames` list.
3. Run `npm run build` - if the filter is working, the name will not be put back into `brands/shop/department_store.json`
4. `git diff` - to make sure that the entries you wanted to discard are gone (and no others are affected)
5. If all looks ok, submit a pull request with your changes.

&nbsp;

### :female_detective: &nbsp; Add wiki tags

Adding `brand:wikipedia` and `brand:wikidata` tags is a very useful task that anybody can help with.

#### Example #1 - Worldwide / English brands...

1. Find an entry in a brand file that is missing these tags:

In `brands/amenity/fast_food.json`:

```js
  "amenity/fast_food|Chipotle": {
    "matchNames": ["chipotle mexican grill"],
    "tags": {
      "amenity": "fast_food",
      "brand": "Chipotle",
      "cuisine": "mexican",
      "name": "Chipotle"
    }
  },
```

2. Google for that brand - if you are lucky, you might find the Wikipedia page right away.

<img width="600px" alt="Google for Chipotle" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/chipotle_1.png"/>

3. From the Wikipedia page URL, you can identify the `brand:wikipedia` value.

OpenStreetMap expects this tag to be formatted like `"en:Chipotle Mexican Grill"`.
* Copy the page name from the URL.
* Add the language prefix - "en:" for the English Wikipedia.
* Replace the underscores '_' with spaces.

On the brand's Wikipedia page, you can also find its "Wikidata item" link.  This appears
under the "tools" menu in the sidebar.

:point_right: protip: [@maxerickson] has created a user script to make copying these values even easier - see [#1881]

[#1881]: https://github.com/osmlab/name-suggestion-index/issues/1881
[@maxerickson]: https://github.com/maxerickson

<img width="600px" alt="Chipotle Wikipedia" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/chipotle_2.png"/>

4. On the brand's Wikidata page, you can identify the `brand:wikidata` value.  It is a code starting with 'Q' and several numbers.

<img width="600px" alt="Chipotle Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/chipotle_3.png"/>

5. Update the brand file, in this case `brands/amenity/fast_food.json`:

We can add the `"brand:wikipedia"` and `"brand:wikidata"` tags.

```js
  "amenity/fast_food|Chipotle": {
    "matchNames": ["chipotle mexican grill"],
    "tags": {
      "amenity": "fast_food",
      "brand:wikidata": "Q465751",                            // added
      "brand:wikipedia": "en:Chipotle Mexican Grill",         // added
      "brand": "Chipotle",
      "cuisine": "mexican",
      "name": "Chipotle"
    }
  },
```

_(comments added for clarity)_

6. Rebuild and submit a pull request.

* Run `npm run build`
* If it does not fail with an error, you can submit a pull request with your changes (warnings are OK).

&nbsp;

#### Example #2 - Regional / non-English brands...

This example uses a brand "かっぱ寿司".  I don't know what that is, so I will do some research.

1. Find an entry in a brand file that is missing these tags:

In `brands/amenity/fast_food.json`:

```js
  "amenity/fast_food|かっぱ寿司": {
    "tags": {
      "amenity": "fast_food",
      "brand": "かっぱ寿司",
      "name": "かっぱ寿司"
    }
  },
```

2. Google for that brand - if you are lucky, you might find the Wikipedia page right away.

Tip: You might want to narrow you search by Googling with a `site:` filter:  `"かっぱ寿司 site:ja.wikipedia.org"`

From these results, we can know that the brand is "Kappazushi", owned by a Japanese company
called "Kappa Create".  We can also find the Wikipedia page.

<img width="600px" alt="Google for かっぱ寿司" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/kappa_1.png"/>

3. As with English brands, you can identify the `brand:wikipedia` value from the URL.
Because this is a Japanese brand, we will link to the Japanese Wikipedia page.

OpenStreetMap expects this tag to be formatted like `"ja:かっぱ寿司"`.
* Copy the page name from the URL.
* Add the language prefix "ja:".
* Replace the underscores '_' with spaces.

Although I can not read Japanese, I can identify the "Wikidata item" link because
it always appears in the sidebar and mouseover will show the Wikidata 'Q' code in the URL.

<img width="600px" alt="Kappa Sushi Wikipedia" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/kappa_3.png"/>

4. On the brand's Wikidata page, you can identify the `brand:wikidata` value.  It is a code starting with 'Q' and several numbers.

Note: The Wikidata page looks a bit sparse - you can edit this too if you want to help!

<img width="600px" alt="Kappa Sushi Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/kappa_4.png"/>

5. Update the brand file, in this case `brands/amenity/fast_food.json`:

We can add:
* `"brand:en"` and `"name:en"` tags to contain the English name "Kappazushi"
* `"name:ja"` and `"brand:ja"` tags to contain the local name "かっぱ寿司"
* `"brand:wikipedia"` and `"brand:wikidata"` tags
* `"cuisine": "sushi"` OpenStreetMap tag
* `"countryCodes"` property, to indicate that this brand should only be used in Japan.

```js
  "amenity/fast_food|かっぱ寿司": {
    "countryCodes": ["jp"],                // added
    "tags": {
      "amenity": "fast_food",
      "brand": "かっぱ寿司",
      "brand:en": "Kappazushi",            // added
      "brand:ja": "かっぱ寿司",            // added
      "brand:wikipedia": "ja:かっぱ寿司",     // added
      "brand:wikidata": "Q11263916",        // added
      "cuisine": "sushi",                   // added
      "name": "かっぱ寿司",
      "name:en": "Kappazushi",              // added
      "name:ja": "かっぱ寿司"               // added
    }
  },
```

_(comments added for clarity)_

6. Rebuild and submit a pull request.

* Run `npm run build`
* If it does not fail with an error, you can submit a pull request with your changes (warnings are OK).

&nbsp;

### :convenience_store: &nbsp; Add missing brands

If it exists, we want to know about it!

Some brands aren't mapped enough (50+ times) to automatically be added to the index so this
is a valuable way to get ahead of incorrect tagging.

1. Before adding a new brand, the minimum information you should know is the correct tagging required for instances of the brand (`name`, `brand` and what it is - e.g. `shop=food`). Ideally you also have `brand:wikidata` and `brand:wikipedia` tags for the brand and any other appropriate tags - e.g. `cuisine`.

2. Add your new entry anywhere into the appropriate file under `brands/*` (the files will be sorted alphabetically later) and using the `"tags"` key add all appropriate OSM tags. Refer to [here](#card_file_box--about-the-brand-files) if you're not familiar with the syntax.

3. If the brand only has locations in a known set of countries add the `"countryCodes": []` key to your new entry. This takes an array of [ISO 3166-1 alpha-2 country codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) in lowercase (e.g. `["de", "at", "nl"]`).

4. If instances of this brand are commonly mistagged add the `"matchNames": []` key to list these. Again, refer to [here](#card_file_box--about-the-brand-files) for syntax.

5. Run `npm run build` and resolve any [duplicate name warnings](#thinking--resolve-warnings).

&nbsp;

#### Using Overpass Turbo

Sometimes you might want to know the locations where a brand name exists in OpenStreetMap.
Overpass Turbo can show them on a map:

1. Go to https://overpass-turbo.eu/

2. Enter your query like this, replacing the `name` and other OpenStreetMap tags.
Because we don't specify a bounding box, this will perform a global query.

```
nwr["name"="かっぱ寿司"]["amenity"="fast_food"];
out center;
```

Tip: The browsable index at http://osmlab.github.io/name-suggestion-index/brands/index.html
can open Overpass Turbo with the query already set up for you.


3. Click run to view the results.

As expected, the "かっぱ寿司" (Kappazushi) locations are all concentrated in Japan.

<img width="600px" alt="Overpass search for かっぱ寿司" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/overpass.png"/>

&nbsp;

### :memo: &nbsp; Edit Wikidata

Editing brand pages on Wikidata is something that anybody can do.  It helps not just our project, but anybody who uses this data for other purposes too!  You can read more about contributing to Wikidata [here](https://www.wikidata.org/wiki/Wikidata:Contribute).

- Add Wikidata entries for brands that don't yet have them.
- Improve the labels and descriptions on the Wikidata entries.
- Translate the labels and descriptions to more languages.
- Add social media accounts under the "Identifiers" section.  If a brand has a Facebook, Instagram, or Twitter account, we can fetch its logo automatically.

Tip: The browsable index at http://osmlab.github.io/name-suggestion-index/brands/index.html
can show you where the Wikidata information is missing or incomplete.

<img width="800px" alt="Adding information on Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/master/docs/img/wikidata.gif"/>

