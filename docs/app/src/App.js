import React from "react";

export default () => (
  <>
  <h1>brands/</h1>
  <div class="instructions"><span class="hi">👋</span>Hi! This project is called <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/">name-suggestion-index</a>.<br/>
  <br/>
  We've collected a list of common business names from <a target="_blank" href="https://www.openstreetmap.org">OpenStreetMap</a>,
  and we're matching them all to their preferred tags, including a <code>'brand:wikidata'</code> tag.<br/>
  <br/>
  This tag is pretty special because we can use it to link features in OpenStreetMap to records
  in <a target="_blank" href="https://www.wikidata.org">Wikidata</a>, a free and open knowledge database.
  <br/>
  You can help us by adding brands to the index, matching brands to Wikidata identifiers, or by improving the brands' Wikidata pages.<br/>
  Each category below displays counts of (brands "complete" with a wikdata link and a logo / brands total).<br/>
  <br/>
  See <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/blob/master/CONTRIBUTING.md">CONTRIBUTING.md</a> for more info.<br/>
  </div>
  </>
);
