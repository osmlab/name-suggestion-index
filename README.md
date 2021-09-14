[![build](https://github.com/osmlab/name-suggestion-index/workflows/build/badge.svg)](https://github.com/osmlab/name-suggestion-index/actions?query=workflow%3A%22build%22)
[![npm version](https://badge.fury.io/js/name-suggestion-index.svg)](https://badge.fury.io/js/name-suggestion-index)

# name-suggestion-index ("NSI")

Canonical features for OpenStreetMap


## What is it?

The goal of this project is to maintain a [canonical](https://en.wikipedia.org/wiki/Canonicalization)
list of commonly used features for suggesting consistent spelling and tagging in OpenStreetMap.

>
> 👉 &nbsp; [Watch the video](https://2019.stateofthemap.us/program/sat/mapping-brands-with-the-name-suggestion-index.html) from our talk at State of the Map US 2019 to learn more about this project!
>

## Browse the index

You can browse the name-suggestion-index and check Wikidata links for accuracy at <https://nsi.guide>.

<img width="600px" alt="nsi.guide" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/nsi_guide.png"/>


## How it's used

When mappers create features in OpenStreetMap, they are not always consistent about how they
name and tag things. For example, we may prefer `McDonald's` tagged as `amenity=fast_food`
but we see many examples of other spellings (`Mc Donald's`, `McDonalds`, `McDonald’s`) and
taggings (`amenity=restaurant`).

Building a canonical feature index allows two very useful things:

- We can suggest the most "correct" way to tag things as users create them while editing.
- We can scan the OSM data for "incorrect" features and produce lists for review and cleanup.

<img width="1017px" alt="Name Suggestion Index in use in iD" src="https://raw.githubusercontent.com/osmlab/name-suggestion-index/main/docs/img/nsi-in-iD.gif"/>

*The name-suggestion-index is in use in iD when adding a new item*

Currently used in:

- [RapiD](https://github.com/facebookincubator/RapiD)
- [iD](https://github.com/openstreetmap/iD) (see above)
- [Vespucci](http://vespucci.io/tutorials/name_suggestions/)
- [JOSM presets](https://josm.openstreetmap.de/wiki/Help/Preferences/Map#TaggingPresets) available
- [Osmose](http://osmose.openstreetmap.fr/en/errors/?item=3130)
- [osmfeatures](https://github.com/westnordost/osmfeatures)
- [Go Map!!](https://github.com/bryceco/GoMap)
- [StreetComplete](https://github.com/streetcomplete/StreetComplete/blob/master/buildSrc/src/main/java/UpdateNsiPresetsTask.kt)


## About the index

See [the project wiki](https://github.com/osmlab/name-suggestion-index/wiki) for details.


## Participate!

We're always looking for help!

- Read [the Code of Conduct](CODE_OF_CONDUCT.md) and remember to be kind to one another.
- See [the project wiki](https://github.com/osmlab/name-suggestion-index/wiki) for info about how to contribute to this index.

If you have any questions or want to reach out to a maintainer, ping
[@bhousel][@bhousel], [@1ec5][@1ec5], or [@tas50][@tas50] on:
- [OpenStreetMap US Slack](https://slack.openstreetmap.us/) (`#poi` or `#general` channels)

[@bhousel]: https://github.com/bhousel
[@1ec5]: https://github.com/1ec5
[@tas50]: https://github.com/tas50


## License

**name-suggestion-index** is available under the [3-Clause BSD License](https://opensource.org/licenses/BSD-3-Clause).
See the [LICENSE.md](LICENSE.md) file for more details.
