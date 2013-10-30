# Name Suggestion Index

The goal of this project is to maintain a canonical list of commonly used name 
values for suggesting correct spelling and/or formatting that might otherwise 
diverge from common usage on OSM. When editing a place name like `Walmart`, users 
create many different spellings such as `Wal-Mart`, `WalMart`, `Walmart Supercenter`. 
In [iD](http://github.com/systemed/iD) we want to help suggest the most common 
names with the correct formatting and spelling. By 'correct', we only mean the 
most common usage on OSM.

This index can also be used for passing translated values for a selected name. 
For example: `McDonald's` is `マクドナルド` in Japanese. The most correct way of 
tagging this would be to use the 'on-the-ground' language in the `name=*` tag and 
any known translations in their appropriate `name:XX` tags. So in Japan, 
`name=マクドナルド` and `name:en=McDonald's`, while in the US `name=McDonald's` and 
`name:jp=マクドナルド`. If we grow this index to include more translations for the 
most common names, we can automatically fill these translated name values when 
one of the suggested values are used. So in an ideal senario, `McDonald's` is selected
and many other translated `name:XX` values are automatically filled in too.

###Structure
    {
        "McDonald's": {
            "name:ja": "マクドナルド",
            "name:zh": "麦当劳",
            "name:ar": "ماكدونالدز"
        },
        "Subway": {},
        "Burger King": {}
    }

Just basic JSON. If you're not familiar with JSON, please look around at how it's done 
elsewhere, things like commas are easily missed. The key for each object is implied to 
be used as the `name=` tag. So any empty object, `{}`, will only fill the `name` 
tag. Any translated values go inside the object.

Objects are also listed in their order of highest usage. This isn't strict but if 
you're going to make edits and could preserve that order it would be nice. 
So a name that has been used a thousand time in OSM is listed above one that might 
have only been used fifty times.

###Getting data from planet
- `git clone https://github.com/osmlab/name-suggestion-index.git && cd name-suggestion-index`
- [~~hack~~ download the planet](http://planet.osm.org/pbf/)
- Ubuntu install:
    - `apt-get update`
    - `apt-get -y install python-dev python-pip build-essential libprotobuf-dev protobuf-compiler`
    - `pip install imposm.parser`

<!-- todo: just make a script, ubuntu.sh -->
