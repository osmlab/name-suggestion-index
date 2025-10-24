# Contributing

This project uses **GitHub** to track issues and manage our source code.
- Check out the [Git Guides](https://github.com/git-guides) to learn more.

This project uses the **JavaScript** programming language.
- [MDN's JavaScript guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) is a great resource for learning about JavaScript.

This project uses the **TypeScript** programming language.
- Check out the [TypeScript Docs](https://www.typescriptlang.org/docs/) to learn more.
- (It's a superset of JavaScript, so knowing that already will help you a lot).

This project uses **Bun** as our development environment.
- Check out the [Bun Docs](https://bun.com/docs) to learn more.
- (It's similar to other JavaScript tools like Node/Jest/Esbuild/Vite, so knowing any of those already will help you a lot).
- Bun supports both JavaScript and TypeScript.

If you want to contribute to name-suggestion-index, you'll probably need to:
- [Install Bun](https://bun.com/docs/installation)
- `git clone` name-suggestion-index
- `cd` into the project folder
- `bun install` the dependencies

As you change things, you'll want to `bun run all` to ensure that things are working.
(This command just runs `clean`, `lint`, `build`, and `test`.)

You can also test the code in a local server:
- `bun start` - then open `http://127.0.0.1:8080/` in a browser.

It's also good to check on the dependencies sometimes with commands like:
- `bun outdated`  - what packages have updates available?
- `bun update --interactive`  - choose which updates to apply

Try to keep things simple!


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
 - [ilias52730](https://github.com/ilias52730)
 - [kjonosm](https://github.com/kjonosm)
 - [快乐的老鼠宝宝 (LaoshuBaby)](https://github.com/LaoshuBaby)
 - [Minh Nguyễn (1ec5)](https://github.com/1ec5)
 - [Tim Smith (tas50)](https://github.com/tas50)
 - [UKChris-osm](https://github.com/UKChris-osm)

We can be found in:
- [OpenStreetMap US Slack](https://slack.openstreetmap.us/) (`#poi` or `#general` channels)
- [OpenStreetMap World Discord](https://discord.gg/openstreetmap)
