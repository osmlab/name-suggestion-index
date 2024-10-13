# Contributing

We're always looking for help!

- Read [the Code of Conduct](CODE_OF_CONDUCT.md) and remember to be kind to one another.
- See [the project wiki](https://github.com/osmlab/name-suggestion-index/wiki) for detailed info about how to contribute to this index, or read below for basic instructions.

## Adding new entries
If a [notable](https://github.com/osmlab/name-suggestion-index/wiki/Judge-Case#notability) entity is missing from the Name Suggestion Index, you can add it manually to establish a preferred tagging. The project wiki has [detailed instructions](https://github.com/osmlab/name-suggestion-index/wiki/Adding-Wikidata-Tags#adding-missing-entities) on how to add a brand, operator, flag, or transit network, but these are the essential steps:
* Find the [Wikidata](https://github.com/osmlab/name-suggestion-index/wiki/Glossary#wikidata) page for the entity you want to add, or [create a page](https://github.com/osmlab/name-suggestion-index/wiki/Editing-Wikidata#creating-wikidata-pages) for the entity if one doesn't exist.
* If you're comfortable with writing code:
  * Clone (fork) the `name-suggestion-index` repository to your userspace.
  * Browse to the relevant [category file](https://github.com/osmlab/name-suggestion-index/wiki/Category-Files) inside the `data` folder. For example, in order to add a brand tagged as `amenity=bank` in OpenStreetMap, you would go to `data/brands/amenity/bank.json`.
  * You can use existing entries as a template for the entity you want to add. Feel free to copy an entry, and change the values of the copied entry to suit the new entity. Don't worry about making sure the entry is in the right place in the file, or providing an `id` for the entry - there is a [build script](https://github.com/osmlab/name-suggestion-index/wiki/Glossary#build-script) that maintainers often run on the `name-suggestion-index` repository that takes care of both automatically.
  * Save your changes, and [submit a pull request](https://github.com/osmlab/name-suggestion-index/pulls) to the `name-suggestion-index` repository to include your changes.
* If you're not comfortable with writing code:
  * [Submit an issue](https://github.com/osmlab/name-suggestion-index/issues) with as many details as possible about the entity you'd like to add. This includes the name, [Wikidata ID](https://github.com/osmlab/name-suggestion-index/wiki/Glossary#wikidata-id), OSM tag category, official website, etc. The more reference details you provide, the more likely it is that a maintainer will work on your request.
 
## Modifying existing entries
If there is a problem with an existing entry, please let us know! You can edit the code yourself to correct the problem (see above for basic instructions), or you can [submit an issue](https://github.com/osmlab/name-suggestion-index/issues) to bring the problem to the attention of the `name-suggestion-index` project maintainers. For more details, see the [Contributing overview page](https://github.com/osmlab/name-suggestion-index/wiki/Contributing#editing-existing-entries) on the project wiki.

## Project contacts
If you have any questions or want to reach out to a maintainer, ping any of these folks:
 - [archpdx (arch0345)](https://github.com/arch0345)
 - [Bryan Housel](https://github.com/bhousel)
 - [Cj Malone](https://github.com/Cj-Malone)
 - [kjonosm](https://github.com/kjonosm)
 - [快乐的老鼠宝宝 (LaoshuBaby)](https://github.com/LaoshuBaby)
 - [Minh Nguyễn (1ec5)](https://github.com/1ec5)
 - [Tim Smith (tas50)](https://github.com/tas50)
 - [UKChris-osm](https://github.com/UKChris-osm)

We can be found in:
- [OpenStreetMap US Slack](https://slack.openstreetmap.us/) (`#poi` or `#general` channels)
- [OpenStreetMap World Discord](https://discord.gg/openstreetmap)
