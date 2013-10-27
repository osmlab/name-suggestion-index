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

<!--

###What we're not doing
We're not making a blacklist of names that, in our opinion, are 'wrong' and should 
be replaced. We're trying to make it easier for users to converge on the most common 
names that are actually used in OSM. Descriptive, not prescriptive. We're following 
the usage of common names on OSM, not prescribing that certain names must match 
exactly the way it says here or that we should set out to change 'wrong' names. 
Just fascilitating the most common usage as described by the data. This isn't the 
place for arguing the correctness of `Walmart` vs `Wal-mart` when the data shows 
one is used more. If you want to change the naming of Walmart across the planet 
to what you define as 'correct', take it elsewhere.

- Should we include count somewhere? It's actually useful.
- When compiling, is the goal a single large JSON file `suggestions.json`
or many small json files that are named very predictably? What are the memory 
implications?
    - Would this be baked into iD?
        - Are we concerned about size? Minify?
    - It's very possibile to keep these on gh-pages and make requests to it.
        - How is wikipedia done? Is that lag acceptable for autocomplete?
-->
