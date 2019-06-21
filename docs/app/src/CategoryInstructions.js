import React from "react";

export default () => (
  <>
  <div class="instructions">Some things you can do here:
  <ul>
  <li>Is a brand name missing or something is incorrect? <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/issues">Open an issue</a> or pull request to add it!</li>
  <li>Click the "View on Overpass Turbo" link to see where the name is used in OpenStreetMap.</li>
  <li>If a record is missing a <code>'brand:wikidata'</code> tag, you can do the research to add it to our project, or filter it out if it is not a brand.<br/>
    See <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/blob/master/CONTRIBUTING.md">CONTRIBUTING.md</a> for more info.</li>
  <li>If a record with a <code>'brand:wikidata'</code> tag has a poor description or is missing logos, click the Wikidata link and edit the Wikidata page.<br/>
    You can add the brand's Facebook, Instagram, or Twitter usernames, and this project will pick up the logos later.</li>
  </ul>
  </div>
  </>
);
