import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement as h} from 'react';
import {ListPage} from './src/incident-list/page.mjs';
import {DetailPage} from './src/incident-detail/page.mjs';
test('both routes keep operational identity and data states',()=>{
 for(const Page of [ListPage,DetailPage]){
  const html=renderToStaticMarkup(h(Page));
  for(const text of ['enterprise-workbench','INC-1042','Synthetic data','data-state="loading"','data-state="empty"','data-state="error"']) assert.ok(html.includes(text),text);
 }
});
