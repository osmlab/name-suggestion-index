#!/bin/bash

for f in $SOURCES
do
    echo "\t\"$f\": {contents}" >> name-suggestions.json
done

