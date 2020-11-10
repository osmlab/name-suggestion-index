
// Returns an object with sorted keys and sorted values.
// (This is useful for file diffing)
module.exports = (obj) => {
  let sorted = {};
  Object.keys(obj).sort(keyCompare).forEach(k => {
    sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
  });
  return sorted;

  function keyCompare(a, b) {
    const qid = /^Q(\d+)$/;
    const aMatch = a.match(qid);
    const bMatch = b.match(qid);
    if (aMatch && bMatch) {
      return parseInt(b[1], 10) - parseInt(a[1], 10);   // sort QIDs numerically
    } else {
      return a.localeCompare(b);
    }
  }
};
