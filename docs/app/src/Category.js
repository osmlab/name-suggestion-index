import React from "react";
import { Link } from 'react-router-dom'

import CategoryInstructions from "./CategoryInstructions";


export default (props) => {
  const tree = props.match.params.tree;
  const k = props.match.params.k;
  const v = props.match.params.v;

  return (
    <>
    <h2>{tree}/{k}/{v}</h2>
    <Link to={"/" + tree}>↑ Back to top</Link>
    <CategoryInstructions />

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
}
