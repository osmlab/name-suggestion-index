## Release Checklist

### Update version, tag, and publish

```bash
git checkout main
git pull origin
npm install
npm run build
npm run wikidata
npm run dist      # version number updates automatically and will print to console
git add . && git commit -m 'vA.B.C'
git tag vA.B.C
git push origin main vA.B.C
npm publish
```

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

### Notes
Be sure that your local copy of the repository has all changes from the remote _before_ running `git tag vA.B.C`, especially any changes that may have come into the repo during the time elapsed between running `git pull origin` and `git add . && git commit -m 'vA.B.C'`. Once `git tag vA.B.C` is run and committed by `git push origin main vA.B.C`, the tag `vA.B.C` is _permanently_ attached to the commit created by `git push origin main vA.B.C`, even if the commit is never submitted to the remote repo due to intervening commits. If the latter situation occurs, the most straightforward resolution is to wait until the following day and repeat the full release checklist to ensure a proper release.

> [!WARNING]  
> Workarounds for a misassigned tag (e.g., giving a newer commit a new tag by appending a suffix to the standard date tag or using the tag of a different day) will not work for multiple reasons. `npm publish` looks for the current day's tag only (and only in the format `v6.0.YYYYMMDD`), and iD's import code for the NSI is rigidly coded to only recognize `v6.0.YYYYMMDD` as valid package names.
