import React from "react";
import CategoryInstructions from "./CategoryInstructions";

export default () => (
  <>
  <h2>brands/category</h2>
  <a class="nav" href="../index.html">↑ Back to top</a>
  <CategoryInstructions/>

  <table class="summary">
  <thead>
  <tr>
  <th>Name<br/>ID<br/>Countries</th>
  <th>Count</th>
  <th>OpenStreetMap Tags</th>
  <th>Wikidata Name/Description<br/>Official Website<br/>Social Links</th>
  <th class="logo">Commons Logo</th>
  <th class="logo">Facebook Logo</th>
  <th class="logo">Twitter Logo</th>
  </tr>
  </thead>

  <tbody>
  <tr>
  <td class="namesuggest"></td>
  <td class="count"></td>
  <td class="tags"></td>
  <td class="wikidata"></td>
  <td class="logo"></td>
  <td class="logo"></td>
  <td class="logo"></td>
  </tr>
  </tbody>

  </table>
  </>
);
