import React from 'react';


export default function CategoryInstructions(props) {
  // setup defaults for this tree..
  const t = props.t;

  let a, itemType, logo, wikidataTag;
  if (t === 'brands') {
    a = 'a';
    itemType = 'brand';
    logo = 'logos';
    wikidataTag = 'brand:wikidata';
  } else if (t === 'denominations') {
    a = 'a';
    itemType = 'denomination';
    logo = 'a commons logo';
    wikidataTag = 'denomination:wikidata';
  } else if (t === 'flags') {
    a = 'a';
    itemType = 'flag';
    logo = 'a commons logo';
    wikidataTag = 'flag:wikidata';
  } else if (t === 'operators') {
    a = 'an';
    itemType = 'operator';
    logo = 'logos';
    wikidataTag = 'operator:wikidata';
  } else if (t === 'transit') {
    a = 'a';
    itemType = 'network';
    logo = 'logos';
    wikidataTag = 'network:wikidata';
  }

  // Flags don't have Facebook accounts
  let social = '';
  if (t !== 'flags') {
    social = `You can add the ${itemType}'s Facebook username, and this project will pick up the logos later.`;
  }

  return (
    <>
    <div className='instructions'>Some things you can do here:
    <ul>
    <li>Is {a} {itemType} missing or something is incorrect? <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/issues'>Open an issue</a> or pull request to add it!</li>
    <li>Click the "Search Overpass Turbo" link to see where the {itemType} is mapped in OpenStreetMap.</li>
    <li>If a record is missing a <code>'{wikidataTag}'</code> tag, you can do the research to add it to our project, or filter it out if it is not {a} {itemType}.<br/>
      See <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/blob/main/CONTRIBUTING.md'>CONTRIBUTING.md</a> for more info.</li>
    <li>If a record with a <code>'{wikidataTag}'</code> tag has a poor description or is missing {logo}, click the Wikidata link and edit the Wikidata page.<br/>{social}</li>
    <li>If an entry you wish to edit is generated from a template, you may need to edit the original (master) template if the values match, or create a seperate new entry if the values will be different.</li>
    </ul>
    </div>
    </>
  );
};
