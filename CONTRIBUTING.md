## Contributing

### tl;dr

##### :raising_hand: &nbsp; How to help:

* [Prerequisites & installation instruction in the README](https://github.com/osmlab/name-suggestion-index#prerequisites)
* `npm run build` will reprocess the files and output warnings
* Resolve warnings - [show me](#thinking--resolve-warnings)
* Remove generic names - [show me](#hocho--remove-generic-names)
* Add `brand:wikidata` and `brand:wikipedia` tags - [show me](#female_detective--add-wiki-tags)
* Add missing brands - [show me](#convenience_store--add-missing-brands)
* Edit Wikidata - [show me](#memo--edit-wikidata)

Tip: You can browse the index at https://nsi.guide/
to see which brands are missing Wikidata links, or have incomplete Wikipedia pages.


##### :no_entry_sign: &nbsp; Don't edit the files in `dist/` - they are generated:

* `dist/collected/*` - all the frequent names and tags collected from OpenStreetMap
* `dist/filtered/*` - subset of names and tags that we are keeping or discarding
* `dist/wikidata.json` - cached brand data retrieved from Wikidata

##### :white_check_mark: &nbsp; Do edit the files in `config/`, `data/`, and `features/`:

* `config/*`
  * `config/filter_brands.json`- Regular expressions used to filter `names_all` into `names_keep` / `names_discard`
  * `config/match_groups.json`- Groups of tag pairs that are considered equal when matching
* `data/*` - Data files for each kind of branded business, organized by topic and OpenStreetMap tag
  * `data/brands/amenity/*.json`
  * `data/brands/leisure/*.json`
  * `data/brands/shop/*.json`
  * and so on...
* `features/*` - Source files for custom locations where brands are active

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
  … and more tags to record its address, opening hours, and so on.
```

&nbsp;

### :bulb: &nbsp; About the name-suggestion-index

The goal of this project is to define the _most correct tags_ to assign to each common brand name.
This helps people contribute to OpenStreetMap, because they can pick "McDonald's" from a list
and not need to worry about the tags being added.

&nbsp;

### :card_file_box: &nbsp; About the data files

__The `data/*` folder contains many files, which together define the most correct OpenStreetMap names and tags.__

These files are created by a several step process:
- Process the OpenStreetMap "planet" data to collect common tags -> for example, `dist/collected/names_all.json`
- Filter all the tags into -> `dist/filtered/names_keep.json` and `dist/filtered/names_discard.json`
- Merge the items we are keeping into -> `data/**/*.json` files for us to decide what to do with them

The data files are organized by topic and OpenStreetMap tag:
* `data/brands/*` - Config files for each kind of branded business, organized by OpenStreetMap tag
  * `amenity/*.json`
  * `leisure/*.json`
  * `shop/*.json`
  * and so on...


Each item looks like this _(comments added for clarity)_:

In `brands/amenity/fast_food.json`:

```js
  "brands/amenity/fast_food": [
    …
    {
      "displayName": "McDonald's",            // "displayName" - Name to display in summary screens and lists
      "id": "mcdonalds-658eea",               // "id" - a unique identifier added and generated automatically
      "locationSet": {"include": ["001"]},    // "locationSet" - defines where this brand is valid ("001" = worldwide)
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

There may also be items for McDonald's in other languages!

```js
  "brands/amenity/fast_food": [
    …
    {
      "displayName": "マクドナルド",            // "displayName" - Name to display in summary screens and lists
      "id": "マクドナルド-3e7699",              // "id" - a unique identifier added and generated automatically
      "locationSet": { "include": ["jp"] },   // "locationSet" - defines where this brand is valid ("jp" = Japan)
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

#### Required properties

##### `displayName`

The `displayName` can contain anything, but it should be a short text appropriate for display in lists or as preset names in editor software.  This is different from the OpenStreetMap `name` tag.

By convention, if you need to disambiguate between multiple brands with the same name, we add text in parenthesis.  Here there are 2 items named "Target", but they have been assigned different display names to tell them apart.

In `brands/shop/department_store.json`:

```js
  "brands/shop/department_store": [
    …
    {
      "displayName": "Target (Australia)",
      "id": "target-c93bbd",
      "locationSet": {"include": ["au"]},
      "tags": {
        "brand": "Target",
        "brand:wikidata": "Q7685854",
        "brand:wikipedia": "en:Target Australia",
        "name": "Target",
        "shop": "department_store"
      }
    },
    {
      "displayName": "Target (USA)",
      "id": "target-592fe0",
      "locationSet": {"include": ["us"]},
      "tags": {
        "brand": "Target",
        "brand:wikidata": "Q1046951",
        "brand:wikipedia": "en:Target Corporation",
        "name": "Target",
        "shop": "department_store"
      }
    },
```

##### `id` (generated)

Each item has a unique `id` generated for it.
When adding new data, don't add the `id` line (key and value).
Then run `npm run build` which will add the key and generate the value automatically.

The identifiers are stable unless the name, key, value, or locationSet change.


##### `locationSet`

Each item requires a `locationSet` to define where the item is available.  You can define the `locationSet` as an Object with `include` and `exclude` properties:

```js
"locationSet": {
  "include": [ Array of locations ],
  "exclude": [ Array of locations ]
}
```

The "locations" can be any of the following:
* Strings recognized by the [country-coder library](https://github.com/ideditor/country-coder#readme). These should be [ISO 3166-1 2 or 3 letter country codes](https://en.wikipedia.org/wiki/List_of_countries_by_United_Nations_geoscheme) or [UN M.49 numeric codes](https://en.wikipedia.org/wiki/UN_M49).<br/>_Example: `"de"`_<br/>Tip: The M49 code for the whole world is `"001"`.
* Filenames for custom `.geojson` features. If you want to use a custom feature, you'll need to add these under the `features/` folder (see ["Features"](#features) below for more details). Each `Feature` must have an `id` property that ends in `.geojson`.<br/>_Example: `"de-hamburg.geojson"`_<br/>Tip: You can use [geojson.io](http://geojson.io) or other tools to create these.

You can view examples and learn more about working with `locationSets` in the [@ideditor/location-conflation](https://github.com/ideditor/location-conflation/blob/main/README.md) project.

⚡️ You can test locationSets on this interactive map:  https://ideditor.github.io/location-conflation/


##### `tags`

Each item requires a `tags` value.  This is just an Object containing all the OpenStreetMap tags that should be set on the feature.


&nbsp;

#### Optional properties

##### `matchNames`/`matchTags`

Brands are often tagged inconsistently in OpenStreetMap.  For example, some mappers write "International House of Pancakes" and others write "IHOP".

This project includes a "fuzzy" matcher that can match alternate names and tags to a single entry in the name-suggestion-index.  The matcher keeps duplicate items out of the index and is used in the iD editor to help suggest tag improvements.

`matchNames` and `matchTags` properties can be used to list the less-preferred alternatives.

```js
  "brands/amenity/fast_food": [     // all items in this file will match the tag `amenity=fast_food`
  …
  {
    "displayName": "Honey Baked Ham",
    "id": "honeybakedham-4d2ff4",
    "locationSet": { "include": ["us"] },
    "matchNames": ["honey baked ham company"],    // also match these less-preferred names
    "matchTags": ["shop/butcher", "shop/deli"],   // also match these less-preferred tags
    "tags": {
      "alt_name": "HoneyBaked Ham",                    // match `alt_name`
      "amenity": "fast_food",
      "brand": "Honey Baked Ham",                      // match `brand`
      "brand:wikidata": "Q5893363",
      "brand:wikipedia": "en:The Honey Baked Ham Company",
      "cuisine": "american",
      "name": "Honey Baked Ham",                       // match `name`
      "official_name": "The Honey Baked Ham Company"   // match `official_name`
    }
  },
  …
```

:point_right: The matcher code also has some useful automatic behaviors...

You don't need to add `matchNames` for:
- Name variations in capitalization, punctuation, spacing (the middots common in Japanese names count as punctuation, so "V・ドラッグ" already matches "vドラッグ")
- Name variations that already appear in the `name`, `brand`, `operator`, `network`.
- Name variations that already appear in an alternate name tag (e.g. `alt_name`, `short_name`, `official_name`, etc.)
- Name variations that already appear in any international version of those tags (e.g. `name:en`, `official_name:ja`, etc.)
- Name variations in diacritic marks (e.g. "Häagen-Dazs" already matches "Haagen-Dazs")
- Name variations in `&` vs. `and`

You don't need to add `matchTags` for:
- Tags assigned to _match groups_ (defined in `config/match_groups.json`). For example, you don't need add `matchTags: ["shop/doityourself"]` to every "shop/hardware"
and vice versa. _Tags in a match group will automatically match any other tags in the same match group._

👉 Bonus: The build script will automatically remove extra `matchNames` and `matchTags` that are unnecessary.


##### `note`

You can optionally add a `note` property to any item.  The note can contain any text useful for maintaining the index - for example, information about the brand's status, or a link to a GitHub issue.

The notes just stay with the name-suggestion-index; they aren't OpenStreetMap tags or used by other software.

```js
  "brands/amenity/bank": [
  …
  {
    {
      "displayName": "United Bank (Connecticut)",
      "id": "unitedbank-28419b",
      "locationSet": { "include": ["peoples_united_bank_ct.geojson"] },
      "note": "Merged into People's United Bank (Q7165802) in 2019, see https://en.wikipedia.org/wiki/United_Financial_Bancorp",
      "tags": {
        "amenity": "bank",
        "brand": "United Bank",
        "brand:wikidata": "Q16959074",
        "brand:wikipedia": "en:United Financial Bancorp",
        "name": "United Bank"
      }
    },
```

&nbsp;

#### Identical names, multiple brands

Sometimes multiple brands use the same name - this is okay!

Make sure each entry has a distinct `locationSet`, and the index will generate unique identifiers for each one.

You should also give each entry a unique `displayName`, so everyone can tell them apart.


```js
  "brands/shop/supermarket": [
    …
    {
      "displayName": "Price Chopper (Kansas City)",
      "id": "pricechopper-9554e9",
      "locationSet": { "include": ["price_chopper_ks_mo.geojson"] },
      "tags": {
        "brand": "Price Chopper",
        "brand:wikidata": "Q7242572",
        "brand:wikipedia": "en:Price Chopper (supermarket)",
        "name": "Price Chopper",
        "shop": "supermarket"
      }
    },
    {
      "displayName": "Price Chopper (New York)",
      "id": "pricechopper-f86a3e",
      "locationSet": { "include": ["price_chopper_ny.geojson"] },
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

### Features

These are optional `.geojson` files found under the `features/` folder. Each feature file must contain a single GeoJSON `Feature` for a region where a brand  is active. Only `Polygon` and `MultiPolygon` geometries are supported.

Feature files look like this:

```js
{
  "type": "Feature",
  "id": "new_jersey.geojson",
  "properties": {},
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

Note: A `FeatureCollection` containing a single `Feature` is ok too - the build script can handle this.

The build script will automatically generate an `id` property to match the filename.

👉 GeoJSON Protips:
* There are many online tools to create or modify `.geojson` files.
* You can draw and edit GeoJSON polygons with [geojson.io](http://geojson.io) - (Editing MultiPolygons does not work in drawing mode, but you can edit the code directly).
* You can simplify GeoJSON files with [mapshaper.org](https://mapshaper.org/)
* [More than you ever wanted to know about GeoJSON](https://macwright.org/2015/03/23/geojson-second-bite.html)


&nbsp;

## What you can do

### :building_construction: &nbsp; Building the project

To rebuild the index, run:
* `npm run build`

This will output a lot of warnings, which you can help fix!

&nbsp;

### :thinking: &nbsp; Resolve warnings

Warnings mean that you need to edit files under `data/brands/*`.
The warning output gives a clue about how to fix or suppress the warning.
If you aren't sure, just ask on GitHub!

&nbsp;

#### Duplicate names

```
  Warning - Potential duplicate:
------------------------------------------------------------------------------------------------------
  If the items are two different businesses,
    make sure they both have accurate locationSets (e.g. "us"/"ca") and wikidata identifiers.
  If the items are duplicates of the same business,
    add `matchTags`/`matchNames` properties to the item that you want to keep, and delete the unwanted item.
  If the duplicate item is a generic word,
    add a filter to config/filter_brands.json and delete the unwanted item.
------------------------------------------------------------------------------------------------------
  "shop/supermarket|Carrefour" -> duplicates? -> "amenity/fuel|Carrefour"
  "shop/supermarket|VinMart" -> duplicates? -> "shop/department_store|VinMart"
```

_What it means:_  These names are commonly tagged differently in OpenStreetMap.  This might be ok, but it might be a mistake.

For "VinMart" we really prefer for it to be tagged as a supermarket.  It's a single brand frequently mistagged.
* Add `"matchTags": ["shop/department_store"]` to the (preferred) `"shop/supermarket|VinMart"` entry
* Delete the (not preferred) entry for `"shop/department_store|VinMart"`

For "Carrefour" we know that can be both a supermarket and a fuel station.  It's two different things.
* Make sure both items have a `brand:wikidata` tag and appropriate `locationSet`.

Existing tagging (you can compare counts in `dist/filtered/names_keep.json`), information at the relevant Wikipedia page or the company's website, and [OpenStreetMap Wiki tag documentation](https://wiki.openstreetmap.org/wiki/Map_Features) all help in deciding how to address duplicate warnings.

If the situation is unclear, one may contact the [local community](https://community.osm.be/) and ask for help.

&nbsp;

### :hocho: &nbsp; Remove generic names

Some of the common names in the index might not actually be brand names. We want to remove these
generic words from the index, so they are not suggested to mappers.

For example, "Универмаг" is just a Russian word for "Department store":

```js
  "brands/shop/department_store": [
    …
    {
      "displayName": "Универмаг",
      "id": "универмаг-d5eaac",
      "locationSet": { "include": ["ru"] },
      "tags": {
        "brand": "Универмаг",
        "name": "Универмаг",
        "shop": "department_store"
      }
    },
  },
```

To remove this generic name:
1. Delete the item from the appropriate file, in this case `data/brands/shop/department_store.json`
2. Edit `config/filter_brands.json`. Add a regular expression matching the generic name in either the `discardKeys` or `discardNames` list.
3. Run `npm run build` - if the filter is working, the name will not be put back into `data/brands/shop/department_store.json`
4. `git diff` - to make sure that the items you wanted to discard are gone (and no others are affected)
5. If all looks ok, submit a pull request with your changes.

&nbsp;

### :female_detective: &nbsp; Add wiki tags

Adding `brand:wikipedia` and `brand:wikidata` tags is a very useful task that anybody can help with.

#### Example #1 - Worldwide / English brands...

1. Find an entry in a brand file that is missing these tags:

In `brands/amenity/fast_food.json`:

```js
  "brands/amenity/fast_food": [
    …
    {
      "displayName": "Chipotle",
      "id": "chipotle-658eea",
      "locationSet": { "include": ["us"] }
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

<img width="600px" alt="Google for Chipotle" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/chipotle_1.png"/>

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

<img width="600px" alt="Chipotle Wikipedia" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/chipotle_2.png"/>

4. On the brand's Wikidata page, you can identify the `brand:wikidata` value.  It is a code starting with 'Q' and several numbers.

<img width="600px" alt="Chipotle Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/chipotle_3.png"/>

5. Update the brand file, in this case `brands/amenity/fast_food.json`:

We can add the `"brand:wikipedia"` and `"brand:wikidata"` tags.

```js
  "brands/amenity/fast_food": [
    …
    {
      "displayName": "Chipotle",
      "id": "chipotle-658eea",
      "locationSet": { "include": ["us"] }
      "matchNames": ["chipotle mexican grill"],
      "tags": {
        "amenity": "fast_food",
        "brand": "Chipotle",
        "brand:wikidata": "Q465751",                            // added
        "brand:wikipedia": "en:Chipotle Mexican Grill",         // added
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
  "brands/amenity/fast_food": [
    …
    {
      "displayName": "かっぱ寿司",
      "id": "かっぱ寿司-3e7699",
      "locationSet": {"include": ["jp"]},
      "tags": {
        "amenity": "fast_food",
        "brand": "かっぱ寿司",
        "name": "かっぱ寿司"
      }
    },
  },
```

2. Google for that brand - if you are lucky, you might find the Wikipedia page right away.

Tip: You might want to narrow you search by Googling with a `site:` filter:  `"かっぱ寿司 site:ja.wikipedia.org"`

From these results, we can know that the brand is "Kappazushi", owned by a Japanese company
called "Kappa Create".  We can also find the Wikipedia page.

<img width="600px" alt="Google for かっぱ寿司" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/kappa_1.png"/>

3. As with English brands, you can identify the `brand:wikipedia` value from the URL.
Because this is a Japanese brand, we will link to the Japanese Wikipedia page.

OpenStreetMap expects this tag to be formatted like `"ja:かっぱ寿司"`.
* Copy the page name from the URL.
* Add the language prefix "ja:".
* Replace the underscores '_' with spaces.

Although I can not read Japanese, I can identify the "Wikidata item" link because
it always appears in the sidebar and mouseover will show the Wikidata 'Q' code in the URL.

<img width="600px" alt="Kappa Sushi Wikipedia" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/kappa_3.png"/>

4. On the brand's Wikidata page, you can identify the `brand:wikidata` value.  It is a code starting with 'Q' and several numbers.

Note: The Wikidata page looks a bit sparse - you can edit this too if you want to help!

<img width="600px" alt="Kappa Sushi Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/kappa_4.png"/>

5. Update the brand file, in this case `brands/amenity/fast_food.json`:

We can add:
* `"brand:en"` and `"name:en"` tags to contain the English name "Kappazushi"
* `"name:ja"` and `"brand:ja"` tags to contain the local name "かっぱ寿司"
* `"brand:wikipedia"` and `"brand:wikidata"` tags
* `"cuisine": "sushi"` OpenStreetMap tag
* Also check the `"locationSet"` property to make sure it is accurate.

```js
  "brands/amenity/fast_food": [
    …
    {
      "displayName": "かっぱ寿司",
      "id": "かっぱ寿司-3e7699",
      "locationSet": {"include": ["jp"]},
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

2. Add your new entry anywhere into the appropriate file under `data/brands/*` (the files will be sorted alphabetically later) and using the `"tags"` key add all appropriate OSM tags. Refer to [here](#card_file_box--about-the-brand-files) if you're not familiar with the syntax.

3. If the brand only has locations in a known set of countries add them to the `"locationSet"` property. This takes an array of [ISO 3166-1 alpha-2 country codes](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) in lowercase (e.g. `["de", "at", "nl"]`).

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

Tip: The browsable index at https://nsi.guide/ can open Overpass Turbo with the query already set up for you.


3. Click run to view the results.

As expected, the "かっぱ寿司" (Kappazushi) locations are all concentrated in Japan.

<img width="600px" alt="Overpass search for かっぱ寿司" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/overpass.png"/>

&nbsp;

### :memo: &nbsp; Edit Wikidata

Editing brand pages on Wikidata is something that anybody can do.  It helps not just our project, but anybody who uses this data for other purposes too!  You can read more about contributing to Wikidata [here](https://www.wikidata.org/wiki/Wikidata:Contribute).

- Add Wikidata pages for brands that don't yet have them.
- Improve the labels and descriptions on the Wikidata pages.
- Translate the labels and descriptions to more languages.
- Add social media accounts under the "Identifiers" section.  If a brand has a Facebook, Instagram, or Twitter account, we can fetch its logo automatically.

Tip: The browsable index at https://nsi.guide/ can show you where the Wikidata information is missing or incomplete.

#### Adding properties to Wikidata

Social media accounts may be used to automatically fetch logos, which are used by the iD Editor.
<img width="800px" alt="Adding information on Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/wikidata.gif"/>

Social media links are often displayed on the official web site of a brand, making them easy to find. When adding an entry for a social media account, it might be worth checking if that account has a "verified badge" which indicates a verified social media account, and if it does, this can be added via the "add qualifier" option, using "has quality" along with either  "verified account" or "verified badge".

<img width="730px" alt="Checking Twitter references in Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/wikidata-applebees-twitter.png"/>

#### Adding references to Wikidata

Wikidata pages without a matching Wikipedia article should have some additional references by independent sources. For our purposes, the easiest one to add is usually something in form of "this shop brand had N shops on some specific date".

<img width="800px" alt="Adding references on Wikidata" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/wikidata_references.gif"/>
<!--See https://www.wikidata.org/w/index.php?title=Wikidata:Administrators%27_noticeboard&oldid=941582891#Entries_that_should_be_now_fixed for discussion on Wikidata-->

#### Creating Wikidata pages

For minor brands there may be no Wikipedia article and it may be [impossible](https://en.wikipedia.org/wiki/Wikipedia:Notability) to create one. In such cases one may still go to [Wikidata](https://www.wikidata.org) and select "[Create a new item](https://www.wikidata.org/wiki/Special:NewItem)" in menu. For such entries it is mandatory to add some external identifier or references (see section above with animation showing how it can be done).
