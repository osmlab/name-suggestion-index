import { styleText } from 'node:util';

const project = 'name-suggestion-index';
const hostname = '127.0.0.1';
const port = 8080;
const matchCDN = new RegExp(`(['"\`])(https?:\/\/cdn.jsdelivr.*${project}.*\/)((dist|docs).*["'\`])`, 'gi');


// Replace urls for CDN hosted files with local file paths.
// e.g. 'https://cdn.jsdelivr.net/npm/project@latest/dist/file.min.js' -> '/dist/file.js'
function replaceCDNPath(s: string): string {
  return s.replaceAll(matchCDN, replacer);
}

// The replacer function for replaceAll:
// p1 = "              - begin string
// p2 = cdn url        - removed
// p3 = path/to/file"  - 'dist' + file (if any) + end string
function replacer(_match: string, p1: string, _p2: string, p3: string): string {
  return p1 + p3;
}


// Start the server!
const server = Bun.serve({
  hostname: hostname,
  port: port,
  development: {
    console: true
  },
  async fetch(req) {
    const url = new URL(req.url);

    // Handle special cases first
    // By default, redirect root `/` to `docs/`
    if (url.pathname === '/') {
      console.log(styleText('yellowBright', `307:  Temporary Redirect → 'docs/'`));
      return new Response('Temporary Redirect', { status: 307, headers: { location: 'docs/' } });
    }

    // Chrome Devtools - generate a workspace JSON file
    // see: http://goo.gle/devtools-automatic-workspace-folders
    if (url.pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
      const contentType = 'application/json;charset=utf-8';
      const root = process.cwd();
      const json = {
        workspace: {
          root: root,
          uuid: Bun.randomUUIDv7()
        }
      };
      console.log(styleText('yellowBright', `${req.method}:  ${url.pathname}`));
      console.log(
        styleText('greenBright', `200:  Generating workspace JSON`) +
        styleText('green', `  ${contentType}`)
      );
      return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': contentType } });
    }

    const path = url.pathname.split('/');
    path.shift();  // remove leading ''

    const last = path.length - 1;
    console.log(styleText('yellowBright', `${req.method}:  ${url.pathname}`));

    if (path[last] === '') {   // no filename, default to 'index.html'
      path[last] = 'index.html';
    }
    if (path[0] === 'docs' && (path[1] === 'dist' || path[1] === 'docs')) {
      path.shift();     // (remove leading 'docs')
    }

    const filepath = './' + path.join('/').replace('.min', '');

    try {
      const file = Bun.file(filepath);
      if (await file.exists()) {
        console.log(
          styleText('greenBright', `200:  Found → '${file.name}'`) +
          styleText('green', `  ${file.type}'`)
        );
        if (/(html|javascript)/.test(file.type)) {
          const content: string = await file.text();
          return new Response(replaceCDNPath(content), { headers: { 'content-type': file.type }});
        } else {
          return new Response(file);
        }
      } else {
        console.log(styleText('redBright', `404:  Not Found → '${filepath}'`));
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.log(styleText('redBright', `500:  Server Error → '${filepath}'`));
      console.error(error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
});

console.log('');
console.log(styleText(['blue', 'bold'], `Bun v${Bun.version}`));
console.log(styleText('cyanBright', `Serving:    docs/*, dist/*`));
console.log(styleText('cyanBright', `Listening:  ${server.url}`));
console.log(styleText(['whiteBright', 'bold'], `Ctrl-C to stop`));
console.log('');
