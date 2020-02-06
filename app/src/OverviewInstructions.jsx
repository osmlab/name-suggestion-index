import React from "react";


export default function OverviewInstructions() {
  return (
    <>
    <div className="instructions"><span className="hi">👋</span>Hi! This project is called <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/">name-suggestion-index</a>.<br/>
    <br/>
    We've collected a list of common business names from <a target="_blank" href="https://www.openstreetmap.org">OpenStreetMap</a>,
    and we're matching them all to their preferred tags, including a <code>'brand:wikidata'</code> tag.<br/>
    <br/>
    This tag is pretty special because we can use it to link features in OpenStreetMap to records
    in <a target="_blank" href="https://www.wikidata.org">Wikidata</a>, a free and open knowledge database.
    <br/>
    You can help us by adding brands to the index, matching brands to Wikidata identifiers,
    or improving the brands' Wikidata pages.<br/>
    <br/>
    Below is a list of categories used by OpenStreetMap. Each category displays a count of brands <strong>"(complete / total)"</strong>,
    where "complete" means the brands have been matched to a Wikidata identifier and a logo.<br/>
    <br/>
    See <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/blob/master/CONTRIBUTING.md">CONTRIBUTING.md</a> for more info.<br/>
    </div>
    </>
  );
};
