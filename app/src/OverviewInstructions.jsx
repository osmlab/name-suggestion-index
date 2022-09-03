import React from 'react';


export default function OverviewInstructions(props) {
  // setup defaults for this tree..
  const t = props.t;

  let itemType, wikidataTag;
  if (t === 'brands') {
    itemType = 'brand';
    wikidataTag = 'brand:wikidata';
  } else if (t === 'flags') {
    itemType = 'flag';
    wikidataTag = 'flag:wikidata';
  } else if (t === 'operators') {
    itemType = 'operator';
    wikidataTag = 'operator:wikidata';
  } else if (t === 'transit') {
    itemType = 'network';
    wikidataTag = 'network:wikidata';
  }

  if (t === "warnings") {
    return (
    <>
      <div className='instructions'>
      <p>
      When the command <strong>npm run wikidata</strong> is run by a maintainer of the project,
      this will connect to Wikidata directly and attempt to download logos and descriptions for each
      entry within the Name Suggestion Index (<abbr title="Name Suggestion Index">NSI</abbr>).
      </p>

      <p>
      Sometimes, Wikidata won't be able to provide the data the <abbr title="Name Suggestion Index">NSI</abbr> is
      looking for, and will return an error message. These error messages are displayed below. Common errors are
      social media accounts listed in a Wikidata entry which are out of date, or simply incorrect.
      </p>

      <p>
      An <strong>unresolved-redirect</strong> is when the Wikidata entry
      the <abbr title="Name Suggestion Index">NSI</abbr> links to is redirecting to a different (possibly newer)
      Wikidata entry. In this instance, the Wikidata reference will need to be updated within
      the <abbr title="Name Suggestion Index">NSI</abbr> data itself.
      </p>

      <p>
      If you can, simply click on a Wikidata link below, and check to see if the error can be fixed. Please note
      that fixing an error will not remove the error message below until <strong>npm run wikidata</strong> has
      been run again.
      </p>
      </div>
    </>
    );
  } else {
    return (
    <>
      <div className='instructions'>
      <p><span className='hi'>👋</span>Hi! This project is called <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/'>name-suggestion-index</a>.<br/>
      </p>

      <p>
      We've collected a list of common {itemType} names from <a target='_blank' href='https://www.openstreetmap.org'>OpenStreetMap</a>,
      and we're matching them all to their preferred tags, including a <code>'{wikidataTag}'</code> tag.
      </p>

      <p>
      This tag is pretty special because we can use it to link features in OpenStreetMap to records
      in <a target='_blank' href='https://www.wikidata.org'>Wikidata</a>, a free and open knowledge database.
      </p>

      <p>
      You can help us by adding {t} to the index, matching {t} to Wikidata identifiers,
      or improving the {t}' Wikidata pages.
      </p>

      <p>
      Below is a list of categories used by OpenStreetMap. Each category displays a count of {t} <strong>"(complete / total)"</strong>,
      where "complete" means the {t} have been matched to a Wikidata identifier and a logo.
      </p>

      <p>
      See <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/blob/main/CONTRIBUTING.md'>CONTRIBUTING.md</a> for more info.
      </p>
      </div>
    </>
    );
  }
};
