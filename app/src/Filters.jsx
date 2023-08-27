import { useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilter } from '@fortawesome/free-solid-svg-icons';

import { AppContext, getFilterParams } from './AppContext';


export function Filters() {
  const context = useContext(AppContext);
  const params = context.params;
  const setParams = context.setParams;
  const filters = getFilterParams(params);
  const klass = 'filters' + (Object.keys(filters).length ? 'active' : '');

  return (
    <div className={klass}>
      <span className='icon'><FontAwesomeIcon icon={faFilter} /></span>
      <span className='filterby'>Filter by</span>

      <span className='field'>
        <label htmlFor='tt'>Text:</label>
        <input type='text' id='tt' name='tt' autoCorrect='off' size='15' value={filters.tt || ''} onChange={filtersChanged} />
      </span>

      <span className='field'>
        <label htmlFor='cc'>Country Code:</label>
        <input type='text' id='cc' name='cc' autoCorrect='off' maxLength='6' size='3' value={filters.cc || ''} onChange={filtersChanged} />
      </span>

      <span className='field'>
        <label htmlFor='inc'>Incomplete:</label>
        <input type='checkbox' id='inc' name='inc' checked={filters.inc === 'true'} onChange={filtersChanged} />
      </span>

      <span className='field'>
        <label htmlFor='dis'>Dissolved:</label>
        <input type='checkbox' id='dis' name='dis' checked={filters.dis === 'true'} onChange={filtersChanged} />
      </span>

      <span className='field'>
        <button className='clearFilters' name='clearFilters' onClick={clearFilters}>Clear</button>
      </span>
    </div>
  );




  function filtersChanged(event) {
    let val;

    if (event.target.type === 'checkbox') {
      val = event.target.checked ? 'true' : '';
    } else {
      val = event.target.value || '';
    }

    const newParams = Object.assign({}, params); // copy
    if (val) {
      newParams[event.target.name] = val;
    } else {
      delete newParams[event.target.name];
    }

    setParams(newParams);
  }


  function clearFilters(event) {
    event.preventDefault();
    event.target.blur();

    const newParams = Object.assign({}, params);  // copy
    for (const k of ['tt', 'cc', 'inc', 'dis']) {
      delete newParams[k];
    }

    setParams(newParams);
  }

};
