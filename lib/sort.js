
// Returns an object with sorted keys and sorted values.
// (This is useful for file diffing)
module.exports = (obj) => {
    let sorted = {};
    Object.keys(obj).sort().forEach(k => {
        sorted[k] = Array.isArray(obj[k]) ? obj[k].sort() : obj[k];
    });
    return sorted;
};
