all:
	@node build.js
	@node buildJosm.js

clean:
	rm -f name-suggestions.json
	rm -f name-suggestions.min.json
	rm -f name-suggestions.presets.xml
