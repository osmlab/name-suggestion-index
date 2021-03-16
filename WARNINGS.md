## Resolving Warnings

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
    add a filter to config/genericWords.json and delete the unwanted item.
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
