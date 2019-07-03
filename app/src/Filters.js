import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFilter } from '@fortawesome/free-solid-svg-icons'


export default function Filters(props) {
  const filters = props.data.filters;
  const setFilters = props.data.setFilters;

  const tt = filters.tt || '';
  const cc = filters.cc || '';

  return (
    <div className="filters">

    <span className="icon"><FontAwesomeIcon icon={faFilter} /></span>
    <span className="filterby">Filter by</span>

    <span className="field">
      <label for="tt">Tag Text:</label>
      <input type="text" id="tt" name="tt" autocorrect="off" size="15"
        value={tt} onChange={filtersChanged} />
    </span>

    <span className="field">
      <label for="cc">Country Code:</label>
      <input type="text" id="cc" name="cc" autocorrect="off" maxlength="2" size="2"
        value={cc} onChange={filtersChanged} />
    </span>

    <span className="field">
      <button className="clearFilters" name="clearFilters"
        onClick={clearFilters}>Clear</button>
    </span>

    </div>
  );


  function filtersChanged(event) {
    let f = Object.assign({}, filters);  // shallow copy
    let val = (event.target.value || '');
    if (val) {
      f[event.target.name] = val;
    } else {
      delete f[event.target.name];
    }
    setFilters(f);
  }


  function clearFilters(event) {
    event.preventDefault();
    event.target.blur();
    setFilters({});
  }

};
