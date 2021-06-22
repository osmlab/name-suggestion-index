#!/usr/bin/env node

// This script will process a planet file and collect frequently occuring tags that we care about.
// It produces files containing all the top names and tags: `dist/collected/names_all.json`
//
// `names_all.json` contains a dictionary object in the format:
// "key/value|name": count
// "amenity/cafe|Starbucks": 159
//
// Please see README.md for more info

// External
import colors from 'colors/safe.js';
import fs from 'node:fs';
import osmium from 'osmium';
import shell from 'shelljs';
import stringify from '@aitodotai/json-stringify-pretty-compact';

// Internal
import { sortObject } from '../lib/sort_object.js';

if (process.argv.length < 3) {
  console.log('');
  console.log('Usage:  node scripts/collect_all.js <planet.osm>');
  console.log('');
  process.exit(1);
}

const POIKEYS = ['amenity', 'shop', 'leisure', 'tourism', 'office', 'craft', 'healthcare'];
const OPERATORKEYS = ['amenity', 'healthcare', 'emergency', 'power', 'route']; //, 'public_transport'];
const NETWORKKEYS = ['amenity', 'power', 'route']; //, 'public_transport'];

collect('name', POIKEYS, 50);
collect('brand', POIKEYS, 50);
collect('operator', OPERATORKEYS, 10);
collect('network', NETWORKKEYS, 10);


function collect(tag, fromKeys, threshold) {
  const what = `${tag}s`;   // names, brands, operators, networks
  const file = `dist/collected/${what}_all.json`;

  const START = '🏗   ' + colors.yellow(`Collecting ${what} from OSM planet...`);
  const END = '👍  ' + colors.green(`${what} collected`);
  console.log('');
  console.log(START);
  console.time(END);

  // Start clean
  shell.rm('-f', file);
  let all = {};

  // process one key at a time to reduce memory footprint
  fromKeys.forEach(k => {
    // count
    console.log(` collecting ${what} from ${k}=*`);
    let counted = {};
    let handler = new osmium.Handler();
    handler.options({ tagged_nodes_only: true });
    handler.on('node', countEntity);
    handler.on('way', countEntity);
    handler.on('relation', countEntity);

    let reader = new osmium.Reader(process.argv[2]);
    osmium.apply(reader, handler);

    // filter
    console.log(` filtering ${k}`);
    for (const kvn in counted) {
      if (counted[kvn] > threshold) {
        all[kvn] = counted[kvn];  // keep
      }
    }

    function countEntity(entity) {
      const n = entity.tags(tag);
      if (!n) return;

      // 'ncn','rcn','lcn', etc.. these are special and not actual networks - ignore them.
      if (tag === 'network' && /^[inrl][chw]n$/.test(n)) return;

      const v = entity.tags(k);
      if (!v) return;

      const kvn = `${k}/${v}|${n}`;
      counted[kvn] = (counted[kvn] || 0) + 1;
    }
  });


  fs.writeFileSync(file, stringify(sortObject(all)) + '\n');
  console.timeEnd(END);
}
