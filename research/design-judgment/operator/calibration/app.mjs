// Operator-only DOM simulator for calibrating assertions. Never copied into candidate arms.
import { filterResources, pauseResources, saveSettings, hasUnsavedChanges } from '/model.mjs';
const initial = await (await fetch('/fixtures.json')).json();
const { mutation } = JSON.parse(document.querySelector('#calibration-config').textContent);
const params = new URLSearchParams(location.search);
const role = params.get('role') || 'editor';
let fixture = params.get('fixture') || 'loaded';
let resources = structuredClone(initial.resources);
const historyEvents = structuredClone(initial.history);
let saved = structuredClone(initial.settings);
let draft = structuredClone(saved);
let query = '', status = 'all', selected = new Set(), notice = '', alert = '', saving = false;
const main = document.querySelector('main');
const outcome = document.querySelector('#save-outcome');
outcome.value = fixture === 'save-failure' ? 'failure' : 'success';
const escape = value => String(value).replace(/[&<>"']/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const permission = () => role === 'viewer' ? '<p data-testid="permission-reason">Viewer role cannot change resources or save settings.</p>' : '';
const messages = () => `<p role="status">${escape(notice)}</p>${alert ? `<p role="alert">${escape(alert)}</p>` : ''}`;
const visibleResources = () => filterResources(fixture === 'empty' ? [] : resources, { query, status });

function navigate(path, { force = false } = {}) {
  if (!force && location.pathname === '/settings' && hasUnsavedChanges(saved, draft) && mutation !== 'dirty-navigation') {
    dialog('Discard changes?', '<p>Your unsaved draft will be discarded.</p>', 'Stay', 'Discard', () => {
      draft = structuredClone(saved); navigate(path, { force: true });
    });
    return;
  }
  if (mutation === 'filter-lost' && path === '/resources') { query = ''; status = 'all'; }
  window.history.pushState({}, '', path);
  notice = ''; alert = ''; render();
}
document.querySelector('nav').addEventListener('click', event => {
  const link = event.target.closest('a');
  if (link) { event.preventDefault(); navigate(link.getAttribute('href')); }
});
window.addEventListener('popstate', render);

function dialog(name, body, cancel, confirm, action) {
  const element = document.createElement('dialog');
  element.setAttribute('aria-label', name);
  element.innerHTML = `<h2>${escape(name)}</h2>${body}<button data-cancel>${cancel}</button><button data-confirm>${confirm}</button>`;
  document.body.append(element);
  const close = () => { element.close(); element.remove(); };
  element.querySelector('[data-cancel]').onclick = () => {
    if (mutation === 'ignore-cancel' && name === 'Pause resources') { close(); action(); } else close();
  };
  element.querySelector('[data-confirm]').onclick = () => { close(); action(); };
  element.addEventListener('cancel', event => { event.preventDefault(); close(); });
  element.showModal();
}

function pause() {
  const effectiveRole = mutation === 'viewer-bulk' ? 'editor' : role;
  let result = pauseResources(resources, [...selected], effectiveRole);
  if (mutation === 'partial-update' && !result.ok) {
    resources = resources.map(resource => selected.has(resource.id) && !resource.protected ? { ...resource, status: 'paused' } : resource);
  }
  if (result.ok) {
    resources = result.resources;
    for (const id of result.changedIds) historyEvents[id].push({ at: '2026-09-04T09:00:00Z', action: 'Resource paused', actor: 'Fixture editor' });
    notice = `${result.changedIds.length} resources paused`; selected.clear(); alert = '';
  } else { alert = result.reason; notice = ''; }
  render();
}

function listRows() {
  const rows = visibleResources();
  const container = main.querySelector('#rows');
  container.innerHTML = rows.map(resource => `<section data-resource-id="${resource.id}">
    <label><input type="checkbox" aria-label="Select ${escape(resource.name)}" value="${resource.id}" ${selected.has(resource.id) ? 'checked' : ''}>Select</label>
    <a href="/resources/${resource.id}">${escape(resource.name)}</a>
    <span>${escape(resource.owner)}</span> <span data-field="status">${resource.status}</span>
    ${resource.protected ? '<span>Protected</span>' : ''}
  </section>`).join('');
  if (rows.length === 0) container.innerHTML = fixture === 'empty'
    ? '<p data-testid="empty-dataset">No resources yet.</p>' : '<p data-testid="no-results">No matching resources.</p>';
  container.querySelectorAll('input').forEach(input => { input.onchange = () => {
    if (input.checked) selected.add(input.value); else selected.delete(input.value);
    updateSelection();
  }; });
  container.querySelectorAll('a').forEach(link => { link.onclick = event => { event.preventDefault(); navigate(link.getAttribute('href')); }; });
  updateSelection();
}

function updateSelection() {
  main.querySelector('[data-testid=selected-count]').textContent = selected.size;
  const rows = visibleResources();
  const all = main.querySelector('#select-all');
  all.checked = rows.length > 0 && rows.every(resource => selected.has(resource.id));
  all.indeterminate = !all.checked && rows.some(resource => selected.has(resource.id));
  main.querySelector('#pause').disabled = !selected.size || (role === 'viewer' && mutation !== 'viewer-bulk');
}

function resourceList() {
  main.innerHTML = '<h1>Resources</h1>';
  if (fixture === 'list-loading') { main.innerHTML += '<p role="status">Loading resources</p>'; return; }
  if (fixture === 'list-error') {
    main.innerHTML += mutation === 'hidden-error' ? '<p>Nothing here.</p>' : '<p role="alert">Resources could not load.</p><button id="retry">Retry</button>';
    const retry = main.querySelector('#retry');
    if (retry) retry.onclick = () => { fixture = 'loaded'; render(); };
    return;
  }
  main.innerHTML += `${permission()}${messages()}
    <div class="controls"><label>Search resources <input id="search" value="${escape(query)}"></label>
    <label for="filter">Status filter</label><select id="filter"><option value="all">All</option><option value="active">Active</option><option value="paused">Paused</option></select></div>
    <label><input id="select-all" type="checkbox">Select all visible</label>
    <span data-testid="selected-count">${selected.size}</span> selected
    <button id="clear">Clear selection</button><button id="pause">Pause selected</button><div id="rows"></div>`;
  main.querySelector('#filter').value = status;
  main.querySelector('#search').oninput = event => { query = event.target.value; if (mutation !== 'selection-leak') selected.clear(); listRows(); };
  main.querySelector('#filter').onchange = event => { status = event.target.value; if (mutation !== 'selection-leak') selected.clear(); listRows(); };
  main.querySelector('#select-all').onchange = event => { selected = new Set(event.target.checked ? visibleResources().map(resource => resource.id) : []); listRows(); };
  main.querySelector('#clear').onclick = () => { selected.clear(); listRows(); };
  main.querySelector('#pause').onclick = () => dialog('Pause resources', `<p>${selected.size} selected</p><ul>${resources.filter(resource => selected.has(resource.id)).map(resource => `<li>${escape(resource.name)}</li>`).join('')}</ul>`, 'Cancel', 'Confirm pause', pause);
  listRows();
}

function resourceDetail(id) {
  const resource = (mutation === 'stale-detail' ? initial.resources : resources).find(item => item.id === id);
  main.innerHTML = '<a id="back" href="/resources">Back to resources</a>';
  main.querySelector('#back').onclick = event => { event.preventDefault(); navigate('/resources'); };
  if (!resource) { main.innerHTML += '<h1>Unknown resource</h1><p role="alert">Resource not found.</p>'; return; }
  main.innerHTML += `<h1>${escape(resource.name)}</h1>`;
  if (fixture === 'detail-loading') { main.innerHTML += '<p role="status">Loading resource</p>'; return; }
  if (fixture === 'detail-error') {
    main.innerHTML += '<p role="alert">Resource could not load.</p><button id="retry">Retry</button>';
    main.querySelector('#retry').onclick = () => { fixture = 'loaded'; render(); }; return;
  }
  main.innerHTML += `${permission()}<p data-testid="resource-status">${resource.status}</p><p data-testid="resource-owner">${escape(resource.owner)}</p>
    <p data-testid="resource-protection">${resource.protected ? 'Protected' : 'Not protected'}</p>
    <section data-testid="resource-history"><h2>History</h2>${fixture === 'history-unavailable'
    ? '<p role="alert">History unavailable. Resource details remain available.</p>'
    : historyEvents[id].length ? `<ol>${historyEvents[id].map(event => `<li>${escape(event.at)} — ${escape(event.action)} — ${escape(event.actor)}</li>`).join('')}</ol>` : '<p>No history yet.</p>'}</section>`;
  // innerHTML additions replace the earlier anchor; wire it after the complete detail render.
  main.querySelector('#back').onclick = event => { event.preventDefault(); navigate('/resources'); };
}

function settings(errors = {}) {
  const field = (key, label, input) => `<label for="${key}">${label}</label>${input}<span id="${key}-error">${escape(errors[key] || '')}</span>`;
  const attrs = key => `id="${key}" name="${key}" aria-invalid="${Boolean(errors[key])}" aria-describedby="${key}-error"`;
  main.innerHTML = `<h1>Settings</h1>${permission()}${messages()}
    <p data-testid="unsaved">${hasUnsavedChanges(saved, draft) ? 'Unsaved changes' : 'No unsaved changes'}</p>
    <form novalidate>${field('workspaceName', 'Workspace name', `<input ${attrs('workspaceName')} value="${escape(draft.workspaceName)}">`)}
    ${field('digest', 'Digest frequency', `<select ${attrs('digest')}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="off">Off</option></select>`)}
    ${field('retentionDays', 'Retention days', `<input inputmode="numeric" ${attrs('retentionDays')} value="${escape(draft.retentionDays)}">`)}
    <button type="submit" ${role === 'viewer' && mutation !== 'viewer-save' ? 'disabled' : ''}>Save settings</button></form>`;
  main.querySelector('#digest').value = draft.digest;
  if (mutation === 'missing-label') main.querySelector('label[for=workspaceName]').remove();
  main.querySelectorAll('input,select').forEach(input => { input.oninput = input.onchange = () => {
    draft[input.name] = input.value;
    main.querySelector('[data-testid=unsaved]').textContent = hasUnsavedChanges(saved, draft) ? 'Unsaved changes' : 'No unsaved changes';
  }; });
  main.querySelector('form').onsubmit = event => {
    event.preventDefault();
    if (saving) return;
    const actualDraft = mutation === 'invalid-save' ? saved : draft;
    const result = saveSettings(saved, actualDraft, { role: mutation === 'viewer-save' ? 'editor' : role, fail: outcome.value === 'failure' });
    if (result.reason === 'invalid') { notice = ''; alert = 'Correct the highlighted fields.'; settings(result.errors); return; }
    saving = true;
    main.querySelector('[role=status]').textContent = 'Saving settings';
    if (mutation !== 'duplicate-save') main.querySelector('button[type=submit]').disabled = true;
    main.querySelectorAll('input,select').forEach(input => { input.disabled = true; });
    setTimeout(() => {
      saving = false;
      if (result.ok) { saved = result.saved; draft = structuredClone(saved); notice = 'Settings saved'; alert = ''; }
      else { notice = ''; alert = result.reason; if (mutation === 'save-loss') draft = structuredClone(saved); }
      settings();
    }, 300);
  };
}

function render() {
  if (location.pathname === '/resources') resourceList();
  else if (location.pathname === '/settings') settings();
  else resourceDetail(location.pathname.split('/').at(-1));
  if (mutation === 'overflow') main.style.width = '1800px';
  if (mutation === 'motion') main.style.animation = 'calibration-motion 2s infinite linear';
}
render();
