## Release Checklist

#### Update version, tag, and publish
- [ ] git checkout master
- [ ] git pull origin
- [ ] npm install
- [ ] npm run build
- [ ] npm run wikidata
- [ ] Update version number in `package.json`
- [ ] npm run dist
- [ ] git add . && git commit -m 'vA.B.C'
- [ ] git tag vA.B.C
- [ ] git push origin master vA.B.C
- [ ] npm publish
