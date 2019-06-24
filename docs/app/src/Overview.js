import React from "react";
import { Link } from 'react-router-dom'

import OverviewInstructions from "./OverviewInstructions";


export default function Overview(props) {
  const tree = props.match.params.tree;
  const k = 'amenity';
  const v = 'bank';

  return (
    <>
    <h1>{tree}/</h1>
    <OverviewInstructions />
    <div className="container">
    <Link to={ [tree,k,v].join('/') }>{ [k,v].join('/') }</Link>
    </div>
    </>
  );
};
