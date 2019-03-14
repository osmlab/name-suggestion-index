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
<link rel='stylesheet' href='../style.css'>`;

    let body = `
<h1>${tree}/</h1>
<div class="instructions"><span class="hi">👋</span>Hi! This project is called <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/">name-suggestion-index</a>.<br/>
<br/>
We've collected a list of common business names from <a target="_blank" href="https://www.openstreetmap.org">OpenStreetMap</a>,
and we're matching them all to their preferred tags, including a <code>'brand:wikidata'</code> tag.<br/>
<br/>
This tag is pretty special because we can use it to link features in OpenStreetMap to records in
<a target="_blank" href="https://www.wikidata.org">Wikidata</a>, a free and open knowledge database.
<br/>
You can help us by adding brands to the index, matching brands to Wikidata identifiers, or by improving the brands' Wikidata pages.<br/>
<br/>
See <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/blob/master/CONTRIBUTING.md">CONTRIBUTING.md</a> for more info.<br/>
</div>

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
}


function generatePage(tree, dict, k, v) {
    let head = `
<meta charset='utf-8'>
<title>${k}/${v}</title>
<link rel='stylesheet' href='../../style.css'>`;

    let body = `
<h2>${tree}/${k}/${v}</h2>
<a class="nav" href="../index.html">↑ Back to top</a>
<div class="instructions">Some things you can do here:
<ul>
<li>Click the "View on Overpass Turbo" link to see where the name is used in OpenStreetMap.</li>
<li>If a record is missing a <code>'brand:wikidata'</code> tag, you can do the research to add it to the index.
See <a target="_blank" href="https://github.com/osmlab/name-suggestion-index/blob/master/CONTRIBUTING.md">CONTRIBUTING.md</a> for more info.</li>
<li>If a record with a <code>'brand:wikidata'</code> tag is missing logos, click the Wikidata link and edit the
Wikidata page. You can add the brand's Facebook, Instagram, or Twitter usernames, and this index will pick up the logos later.</li>
</ul>
</div>

<table class="summary">
<thead>
<tr>
<th>name</th>
<th>count</th>
<th>brand:wikidata</th>
<th>wikicommons logo</th>
<th>facebook</th>
<th>twitter</th>
</tr>
<thead>
<tbody>`;

    Object.keys(dict[k][v]).forEach(name => {
        let entry = dict[k][v][name];
        let count = entry.count || '< 50';
        let tags = entry.tags || {};
        let logos = entry.logos || {};
        let slug = slugify(name);

        body += `
<tr>
<td><h3 class="slug" id="${slug}"><a href="#${slug}"/>#</a><span class="anchor">${tags.name}</span></h3>
  <pre>'${name}'</pre>` + overpass(k, v, tags.name) + `
</td>
<td>${count}</td>
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

function slugify(text) {
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

