#!/bin/bash
SOURCES=$(find */ -type f -name '*.json' | sort)

for f in $SOURCES
do
    echo "    \""${f%".json"}"\":" >> name-suggestions.json
    cat $f >> name-suggestions.json
    echo "," >> name-suggestions.json
done
