## Release Checklist

### Update version, tag, and publish
- [ ] git checkout main
- [ ] git pull origin
- [ ] npm install
- [ ] npm run build
- [ ] npm run wikidata
- [ ] npm run dist  _(version number updates automatically and will print to console)_
- [ ] git add . && git commit -m 'A.B.C'
- [ ] git tag A.B.C
- [ ] git push origin main A.B.C
- [ ] npm publish
