const colors = require('colors/safe');
const fileTree = require('./lib/file_tree');
const fs = require('fs-extra');
const shell = require('shelljs');
const sort = require('./lib/sort');

// Load and check brand files
let brands = fileTree.read('brands');

writeDocs('brands', brands);


function writeDocs(tree, obj) {
    console.log('\nwriting ' + tree);
    console.time(colors.green(tree + ' written'));
    let dict = {};

    // Start clean
    shell.rm('-rf', ['docs/brands']);

    // populate K-V dictionary
    Object.keys(obj).forEach(k => {
        let parts = k.split('|', 2);
        let tag = parts[0].split('/', 2);
        let key = tag[0];
        let value = tag[1];

        dict[key] = dict[key] || {};
        dict[key][value] = dict[key][value] || {};
        dict[key][value][k] = sort(obj[k]);

        if (dict[key][value][k].tags) {
            dict[key][value][k].tags = sort(obj[k].tags);
        }
    });

    generateIndex(tree, dict);

    Object.keys(dict).forEach(k => {
        let entry = dict[k];
        Object.keys(entry).forEach(v => {
            generatePage(tree, dict, k, v);
        });
    });

    console.timeEnd(colors.green(tree + ' written'));
}


function generateIndex(tree, dict) {
    let head = `
<meta charset='utf-8'>
<title>${tree}</title>
<link rel='stylesheet' href='./style.css'>`;

    let body = `
<h1>${tree}/</h1>
<div class="container">`;
    Object.keys(dict).forEach(k => {
        let entry = dict[k];
        Object.keys(entry).forEach(v => {
            let href = `${k}/${v}.html`;
            let count = Object.keys(dict[k][v]).length;
            body += `
<div class="child"><a href="${href}">${k}/${v} (${count})</a></div>`;
        });
    });

    body += `
</div>`;

    writeHTML(`./docs/${tree}/index.html`, head, body);
    writeCSS(`./docs/${tree}/style.css`);
}


function generatePage(tree, dict, k, v) {
    let head = `
<meta charset='utf-8'>
<title>${k}/${v}</title>
<link rel='stylesheet' href='../style.css'>`;

    let body = `
<h2>${tree}/${k}/${v}</h2>
<a class="nav" href="../index.html">↑ Back to top</a>
<table class="summary">
<thead>
<tr>
<th>name</th>
<th>brand:wikidata</th>
<th>wikicommons logo</th>
<th>facebook</th>
<th>twitter</th>
</tr>
<thead>
<tbody>`;

    Object.keys(dict[k][v]).forEach(name => {
        let entry = dict[k][v][name];
        let tags = entry.tags || {};
        let logos = entry.logos || {};
        let slug = slugify(name);

        body += `
<tr>
<td><h3 class="slug" id="${slug}"><a href="#${slug}"/>#</a><span class="anchor">${tags.name}</span></h3>
  <pre>'${name}'</pre>` + overpass(k, v, tags.name) + `
</td>
<td>` + wd(tags['brand:wikidata']) + `</td>
<td>` + img(logos.wikidata) + `</td>
<td>` + img(logos.facebook) + `</td>
<td>` + img(logos.twitter) + `</td>
</tr>`;
    });

    body += `
</tbody>
</table>
</div>`;

    writeHTML(`./docs/${tree}/${k}/${v}.html`, head, body);
}


function overpass(k, v, name) {
    let q = encodeURI(`[out:json][timeout:25];
(nwr["${k}"="${v}"]["name"="${name}"];);
out body;
>;
out skel qt;`);
    let href = `https://overpass-turbo.eu/?Q=${q}&R`;
    return `<a target="_blank" href="${href}"/>View on Overpass Turbo</a>`;
}

function img(src) {
    return src ? `<img src="${src}"/>` : '';
}

function wd(qid) {
    return qid ? `<a target="_blank" href="https://www.wikidata.org/wiki/${qid}">${qid}</a>` : '';
}

function slugify(text)
{
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}


function writeHTML(file, head, body) {
    let contents = `<!DOCTYPE html>
<html>
<head>
${head}
</head>
<body>
${body}
</body>
</html>`;

    try {
        fs.ensureFileSync(file);
        fs.writeFileSync(file, contents);
    } catch (err) {
        console.error(colors.red('Error - ' + err.message + ' writing:'));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
    }
}


function writeCSS(file) {
    let contents = `
html, body {
    width: 100%;
    height: 100%;
}

body {
  font: normal 12px/1.6667 "-apple-system", BlinkMacSystemFont,
    "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell",
    "Fira Sans", "Droid Sans", "Helvetica Neue", "Arial",
    sans-serif;
  margin: 0;
  padding: 0 20px;
  color: #333;
  font-size: 14px;
}

div.container {
  display: flex;
  flex-flow: row wrap;
}
div.child {
  display: flex;
  flex: 0 0 250px;
  padding: 5px;
}

.nav {
  margin-top: 10px;
}

table.summary {
  border: 1px solid #000;
  text-align: left;
  border-collapse: collapse;
  margin-top: 20px;
}
table.summary th {
  position: sticky;
  top: -1px;
  background: #ddd;
  border: 1px solid #000;
  padding: 3px 5px;
  font-size: 15px;
  font-weight: bold;
  color: #000;
}
table.summary td {
  border: 1px solid #000;
  padding: 3px 5px;
}
table.summary tbody td {
  font-size: 13px;
  max-height: 100px;
}
a {
  text-decoration: none;
}
a:hover {
  color: #597be7;
}
:focus {
  outline-color: transparent;
  outline-style: none;
}
tbody h3.slug::before {
  display: block;
  content: " ";
  margin-top: -50px;
  height: 50px;
  visibility: hidden;
  pointer-events: none;
}
tbody span.anchor {
  margin: 0 5px;
}
`;

    try {
        fs.ensureFileSync(file);
        fs.writeFileSync(file, contents);
    } catch (err) {
        console.error(colors.red('Error - ' + err.message + ' writing:'));
        console.error('  ' + colors.yellow(file));
        process.exit(1);
    }
}
