## Release Checklist

### Update version, tag, and publish
- [ ] git checkout main
- [ ] git pull origin
- [ ] npm install
- [ ] npm run build
- [ ] npm run wikidata
- [ ] npm run dist  _(version number updates automatically and will print to console)_
- [ ] git add . && git commit -m 'vA.B.C'
- [ ] git tag vA.B.C
- [ ] git push origin main vA.B.C
- [ ] npm publish

### Purge JSDelivr CDN cache
Include any URLs that iD/Rapid/others might request.

```bash
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/nsi.min.json'
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/dissolved.min.json'
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/featureCollection.min.json'
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/genericWords.min.json'
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/presets/nsi-id-presets.min.json'
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/replacements.min.json'
curl 'https://purge.jsdelivr.net/npm/name-suggestion-index@6.0/dist/trees.min.json'
```
