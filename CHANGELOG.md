# What's New

**name-suggestion-index** is an open source project. You can submit bug reports, help out,
or learn more by visiting our project page on GitHub:  :octocat: https://github.com/osmlab/name-suggestion-index

Please star our project on GitHub to show your support! ⭐️

_Breaking changes, which may affect downstream projects, are marked with a_ ⚠️


<!--
# A.B.C
##### YYYY-MMM-DD

* Added resources:
* Added events:
* Updated:

[#xxxx]: https://github.com/osmlab/name-suggestion-index/issues/xxxx
-->

# 6.0.YYYYMMDD
##### 2021-Jun-24
* Bump to location-conflation v1.0.2 / country-coder v5.0.3
* ⚠️  Replace rollup/parcel/babel with [esbuild](https://esbuild.github.io/) for super fast build speed. Package exports are now:
  * `"module": "./index.mjs"` - ESM, modern JavaScript, works with `import`
  * `"main": "./dist/javascript/nsi.cjs"` - CJS bundle, modern JavaScript, works with `require()`
  * `Matcher()` is a class now.  Instantiate it like: `matcher = new Matcher();`
  * No longer distributing ES5 builds
* ⚠️  name-suggestion-index is marked as `"type": "module"` now
* ⚠️  Dropped support for old browsers like Internet Explorer on https://nsi.guide


# 5.0.YYYYMMDD
##### 2021-Mar-22
* ⚠️  Significant refactor ([#4543], [#4964]):
  * Add support for multiple trees (brands, operators, flags, transit) ([#4231], [#4745])
  * Major changes to the name matching code, match generic patterns too ([#4924])
  * Change file format to store per-category exclude patterns ([#4906])
  * Add support for generated unique identifiers ([#3995])
  * Add support for template-generated categories ([#2883])

[#2883]: https://github.com/osmlab/name-suggestion-index/issues/2883
[#3995]: https://github.com/osmlab/name-suggestion-index/issues/3995
[#4231]: https://github.com/osmlab/name-suggestion-index/issues/4231
[#4543]: https://github.com/osmlab/name-suggestion-index/issues/4543
[#4745]: https://github.com/osmlab/name-suggestion-index/issues/4745
[#4906]: https://github.com/osmlab/name-suggestion-index/issues/4906
[#4924]: https://github.com/osmlab/name-suggestion-index/issues/4924
[#4964]: https://github.com/osmlab/name-suggestion-index/issues/4964
