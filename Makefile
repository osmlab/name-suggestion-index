all:
	echo "{" > name-suggestions.json
	sh build.sh
	echo "}" >> name-suggestions.json

clean:
	rm -f name-suggestions.json
