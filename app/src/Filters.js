import React from "react";


export default function Filters(props) {
  const filters = props.data.filters;
  const setFilters = props.data.setFilters;

  const n = filters.n || '';
  const c = filters.c || '';

  return (
    <div className="filters">

    <span className="icon"><i className="fas fa-lg fa-filter"></i></span>
    <span className="filterby">Filter by</span>

    <span className="field">
    <label for="n">Name:</label>
    <input type="text" id="n" name="n" autocorrect="off" size="15"
      value={n} onChange={filtersChanged} />
    </span>

    <span className="field">
    <label for="c">Country Code:</label>
    <input type="text" id="c" name="c" autocorrect="off" maxlength="2" size="2"
      value={c} onChange={filtersChanged} />
    </span>

    <span className="field">
    <button className="clearFilters" name="clearFilters"
      onClick={clearFilters}>Clear</button>
    </span>

    </div>
  );


  function filtersChanged(event) {
    let f = Object.assign({}, filters);  // shallow copy
    let val = (event.target.value || '').trim();
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
