import commonjs from 'rollup-plugin-commonjs';
import json from 'rollup-plugin-json';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
  input: 'index.mjs',
  output: {
    name: 'nsi',
    file: 'dist/index.js',
    format: 'umd'
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    json({ indent: '' })
  ]
};
