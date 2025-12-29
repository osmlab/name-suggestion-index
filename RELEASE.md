## Release Checklist

### Update version, tag, and publish

```bash
# Make sure your main branch is up to date and all tests pass
git checkout main
git pull origin
bun install
bun run all         # fast

# These scripts prepare the files in the dist folder
bun run wikidata    # slow, about 10 minutes
bun run dist        # fast, version number updates automatically and will print to console

git add . && git commit -m 'vA.B.C'
git tag vA.B.C
git push origin main vA.B.C
npm login           # npm uses shorter-life tokens now, this may be needed
bun publish

```
