import {h,Shell} from '../shared/components.mjs';
export const incidents = [
 {id:'INC-1042',title:'Checkout requests timing out',service:'Checkout API',owner:'Response team A',status:'Investigating',priority:'P1'},
 {id:'INC-1041',title:'Delayed inventory synchronization',service:'Inventory worker',owner:'Response team B',status:'Monitoring',priority:'P2'},
 {id:'INC-1038',title:'Webhook delivery restored',service:'Delivery gateway',owner:'Response team C',status:'Resolved',priority:'P3'},
];
export function ListPage(){return h(Shell,null,
 h('header',{className:'intro'},h('h1',null,'Incident queue'),h('p',{className:'muted'},'Prioritize the response. Keep the context close.')),
 h('div',{'data-loaded':true},
 h('section',{className:'panel priority','aria-label':'Priority incident'},h('span',{className:'eyebrow danger'},'P1 · Investigating · INC-1042'),h('h2',null,'Checkout requests timing out'),h('p',null,'Customers may be unable to complete checkout. The response team is isolating a slow upstream dependency.'),h('p',{className:'metadata'},'Checkout API · Response team A · Opened 09:02 UTC'),h('a',{className:'button',href:'./incident.html'},'Inspect priority incident')),
 h('section',{className:'panel','aria-labelledby':'queue-title'},h('div',{className:'section-head'},h('h2',{id:'queue-title'},'All incidents'),h('span',{className:'metadata','data-result-count':true,role:'status','aria-atomic':'true'},'3 incidents')),
 h('div',{className:'search'},h('label',{htmlFor:'incident-search'},'Search incidents'),h('div',{className:'search-controls'},h('input',{id:'incident-search',type:'search',placeholder:'Title, incident ID, or service','aria-describedby':'search-hint','aria-controls':'incident-queue'}),h('button',{type:'button',className:'button secondary','data-clear-search':true,hidden:true},'Clear search')),h('p',{id:'search-hint',className:'metadata'},'Filters the queue below. Priority incident context stays visible.')),
 h('ul',{id:'incident-queue',className:'queue'},...incidents.map(x=>h('li',{className:'incident-row',key:x.id,'data-incident-id':x.id,'data-search-text':[x.title,x.id,x.service].join(' ')},h('div',{className:'row-main'},h('span',{className:'metadata'},x.id+' · '+x.service),h('h3',null,x.id==='INC-1042'?h('a',{href:'./incident.html'},x.title):x.title),h('p',{className:'metadata'},x.owner)),h('span',{className:'state-label '+(x.priority==='P1'?'danger':'muted')},x.priority+' · '+x.status)))),
 h('div',{className:'no-results','data-no-results':true,hidden:true},h('h3',null,'No incidents match your search'),h('p',{className:'muted'},'Try a different title, incident ID, or service. Clear search to show all incidents.'))),
 h('section',{className:'panel'},h('h2',null,'Response handoff'),h('p',{className:'muted'},'Start with the priority incident. Review the latest observation and checklist before handing off to the next responder.'))));}
