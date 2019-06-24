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

    <table className="summary">
    <thead>
    <tr>
    <th>Name<br/>ID<br/>Countries</th>
    <th>Count</th>
    <th>OpenStreetMap Tags</th>
    <th>Wikidata Name/Description<br/>Official Website<br/>Social Links</th>
    <th className="logo">Commons Logo</th>
    <th className="logo">Facebook Logo</th>
    <th className="logo">Twitter Logo</th>
    </tr>
    </thead>

    <tbody>
    <tr>
    <td className="namesuggest"></td>
    <td className="count"></td>
    <td className="tags"></td>
    <td className="wikidata"></td>
    <td className="logo"></td>
    <td className="logo"></td>
    <td className="logo"></td>
    </tr>
    </tbody>

    </table>
    </>
  );
}
