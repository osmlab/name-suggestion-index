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
