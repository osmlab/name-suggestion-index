import { useContext } from 'react';
import { AppContext } from './AppContext';


export function OverviewInstructions() {
  const context = useContext(AppContext);
  const params = context.params;
  const t = params.t;

  // Setup replacement strings based on the chosen tree..
  let itemType, itemTypes, wikidataTag;
  if (t === 'brands') {
    itemType = 'brand';
    itemTypes = 'brands';
    wikidataTag = 'brand:wikidata';
  } else if (t === 'flags') {
    itemType = 'flag';
    itemTypes = 'flags';
    wikidataTag = 'flag:wikidata';
  } else if (t === 'operators') {
    itemType = 'operator';
    itemTypes = 'operators';
    wikidataTag = 'operator:wikidata';
  } else if (t === 'transit') {
    itemType = 'network';
    itemTypes = 'transit networks';
    wikidataTag = 'network:wikidata';
  } else {
    itemType = 'item';
    itemTypes = 'items';
    wikidataTag = '*:wikidata';
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
      You can help us by adding {itemTypes} to the index, matching {itemTypes} to Wikidata identifiers,
      or <a href='#' onClick={(e) => { e.preventDefault(); context.setParams({ ...params, view: 'warnings' }); }}>improving</a> the Wikidata page for already indexed {itemTypes}.<br/>
      <br/>
      If something is missing from this list, you can use <a target='_blank' href="https://ga-kevin-codes.codeberg.page/Suggest-A-Brand/">Suggest-A-Brand</a>,
      or <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/issues">open an issue</a> on our GitHub to let us know.<br/>
      <br/>
      Below is a list of categories used by OpenStreetMap. Each category displays a count of {itemTypes} <strong>"(complete / total)"</strong>,
      where "complete" means the {itemTypes} have been matched to a Wikidata identifier and a logo.<br/>
      <br/>
      See <a target='_blank' href='https://github.com/osmlab/name-suggestion-index/blob/main/CONTRIBUTING.md'>CONTRIBUTING.md</a> for more info.<br/>
    </div>
  );
};
