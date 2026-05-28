import { $, Glob } from 'bun';
import XMLBuilder from 'fast-xml-builder';
import { styleText } from 'node:util';

import type { XmlBuilderOptions } from 'fast-xml-builder';

const withLocale = new Intl.Collator('en-US').compare;  // specify 'en-US' for stable sorting

await buildSitemap();


/**
 * Generate a sitemap for https://nsi.guide and write it to `./docs/sitemap.xml`.
 * Per-URL `lastmod` is derived from the most recent git commit that touched
 * the corresponding category file (or `docs/index.html` for the root URL).
 * Falls back to "now" if a file isn't tracked in git (e.g. shallow clone).
 * @see https://en.wikipedia.org/wiki/Sitemaps
 */
export async function buildSitemap() {
  const START = '🏗   ' + styleText('yellow', 'Building sitemap…');
  const END = '👍  ' + styleText('green', 'sitemap built');
  console.log('');
  console.log(START);
  console.time(END);

  const changefreq = 'weekly';
  const nowISO = (new Date()).toISOString();

  // Collect all category files under data/ as `tree/key/value` tkv paths.
  const glob = new Glob('data/*/*/*.json');
  const tkvs: string[] = [];
  for await (const file of glob.scan({ cwd: '.' })) {
    // file = 'data/<tree>/<key>/<value>.json'
    const tkv = file.slice('data/'.length, -'.json'.length);
    tkvs.push(tkv);
  }
  tkvs.sort(withLocale);

  // Build a map of `<path> -> <ISO commit date>` for all data/ category files
  // and docs/index.html in a single git invocation.
  // Output format (one commit per block):
  //   COMMIT 2024-11-18T00:31:46-05:00
  //   data/transit/route/walking_bus.json
  //   data/...
  const lastmodByFile = new Map<string, string>();
  try {
    const out = await $`git log --name-only --format=COMMIT\ %cI -- data docs/index.html`.text();
    let currentDate = '';
    for (const line of out.split('\n')) {
      if (line.startsWith('COMMIT ')) {
        currentDate = line.slice('COMMIT '.length).trim();
      } else if (line && currentDate && !lastmodByFile.has(line)) {
        // First time we see a file == most recent commit that touched it
        lastmodByFile.set(line, new Date(currentDate).toISOString());
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(styleText('yellow', `Warning: could not read git history for sitemap lastmod (${message}). Falling back to current date.`));
  }

  const indexLastmod = lastmodByFile.get('docs/index.html') ?? nowISO;
  const url = [
    { loc: 'https://nsi.guide/index.html', changefreq, lastmod: indexLastmod },
    ...tkvs.map(tkv => {
      const [t, k, v] = tkv.split('/', 3);     // tkv = "tree/key/value"
      const file = `data/${tkv}.json`;
      const lastmod = lastmodByFile.get(file) ?? nowISO;
      return {
        loc: `https://nsi.guide/index.html?t=${t}&k=${k}&v=${v}`,
        changefreq,
        lastmod
      };
    })
  ];

  const xmlBuilderOptions = {
    ignoreAttributes: false,
    suppressEmptyNode: true
  } satisfies XmlBuilderOptions;

  const builder = new XMLBuilder({ ...xmlBuilderOptions, format: true });
  const xml = builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    urlset: {
      '@_xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
      url
    }
  });
  await Bun.write('./docs/sitemap.xml', xml);

  console.timeEnd(END);
}
