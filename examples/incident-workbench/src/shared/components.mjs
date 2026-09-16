import { createElement as h } from 'react';
export { h };
export function StatePanels({detail}) {
  return h('div', null, ...[
    ['loading', 'Loading incident context', 'The fixture is holding this state for inspection.'],
    ['empty', 'No incidents in this view', 'There is no incident context to display. Return to the queue to continue.'],
    ['error', 'Incident data could not be loaded', 'Your place is preserved. Try loading the local fixture again.'],
  ].map(([state, title, text])=>h('section',{key:state,hidden:true,'data-state':state,className:'panel state-panel',role:state==='error'?'alert':'status'},h('h2',null,title),h('p',{className:'muted'},text),state!=='loading'&&h('a',{className:'button secondary',href:state==='error'&&detail?'./incident.html':'./index.html'},state==='error'?'Try again':'Back to incident queue'))));
}
export function Shell({detail, children}) {
 return h('div',{'data-styleseed-recipe':'enterprise-workbench',className:'shell'},
  h('a',{className:'skip',href:'#main'},'Skip to main content'),
  h('aside',{className:'sidebar'},h('span',{className:'brand'},'Incident Workbench'),h('nav',{'aria-label':'Main'},h('a',{className:'nav-link',href:'./index.html','aria-current':detail?undefined:'page'},'Incident queue')),h('p',{className:'sidebar-note'},'Operations workspace',h('br'), 'Local acceptance fixture')),
  h('main',{id:'main',tabIndex:-1},h('div',{className:'topline'},h('span',{className:'crumb'},detail?'Incident queue / INC-1042':'Operations / Incident queue'),h('span',{className:'demo'},'Synthetic data · not live')),children,h(StatePanels,{detail}),h('footer',null,'Fixture snapshot · 08 September 2026, 09:20 UTC. No external services.')));
}
