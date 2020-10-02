import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';

import App from './App';

// force full page refreshes for bots
const forceRefresh = /bot|google|baidu|bing|msn|teoma|slurp|yandex/i.test(navigator.userAgent);

ReactDOM.render(
  <BrowserRouter forceRefresh={forceRefresh}>
    <App />
  </BrowserRouter>,
  document.getElementById('root')
);
