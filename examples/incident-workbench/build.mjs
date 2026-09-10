import {mkdirSync,readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement as h} from 'react';
import {ListPage} from './src/incident-list/page.mjs';
import {DetailPage} from './src/incident-detail/page.mjs';
mkdirSync('dist',{recursive:true});
const palette=readFileSync('.styleseed/palettes/incident-list.css','utf8');
const style=palette+'\n'+['tokens.css','app.css'].map(p=>readFileSync('src/shared/'+p,'utf8')).join('\n');
for(const [file,Component] of [['index.html',ListPage],['incident.html',DetailPage]]) {
 writeFileSync('dist/'+file,'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Incident Workbench · '+(file==='index.html'?'Queue':'INC-1042')+'</title><style>'+style+'</style></head><body>'+renderToStaticMarkup(h(Component))+'<script src="./client.js"></script></body></html>');
}
copyFileSync('src/shared/client.js','dist/client.js');
console.log('Built two static React routes.');
