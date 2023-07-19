import { useContext } from 'react';
import { AppContext } from './AppContext';


export function OverviewInstructions() {
  const context = useContext(AppContext);
  const params = context.params;
  const t = params.t;

  // setup defaults for this tree..
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

  return (
    <div className='instructions'><span className='hi'>👋</span>Hi! This project is called <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/'>name-suggestion-index</a>.<br/>
      <br/>
      We've collected a list of common {itemType} names from <a target='_blank' href='https://www.openstreetmap.org'>OpenStreetMap</a>,
      and we're matching them all to their preferred tags, including a <code>'{wikidataTag}'</code> tag.<br/>
      <br/>
      This tag is pretty special because we can use it to link features in OpenStreetMap to records
      in <a target='_blank' href='https://www.wikidata.org'>Wikidata</a>, a free and open knowledge database.
      <br/>
      You can help us by adding {t} to the index, matching {t} to Wikidata identifiers,
      or improving the {t}' Wikidata pages.<br/>
      <br/>
      Below is a list of categories used by OpenStreetMap. Each category displays a count of {t} <strong>"(complete / total)"</strong>,
      where "complete" means the {t} have been matched to a Wikidata identifier and a logo.<br/>
      <br/>
      See <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/blob/main/CONTRIBUTING.md'>CONTRIBUTING.md</a> for more info.<br/>
    </div>
  );
};
