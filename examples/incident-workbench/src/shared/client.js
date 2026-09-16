const state = new URLSearchParams(location.search).get('state');
if (['loading', 'empty', 'error'].includes(state)) {
  document.querySelector('[data-loaded]').hidden = true;
  document.querySelector(`[data-state="${state}"]`).hidden = false;
}

const search = document.querySelector('#incident-search');
if (search) {
  const rows = [...document.querySelectorAll('[data-search-text]')];
  const clear = document.querySelector('[data-clear-search]');
  const count = document.querySelector('[data-result-count]');
  const noResults = document.querySelector('[data-no-results]');
  function filterQueue() {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    for (const row of rows) {
      row.hidden = !row.dataset.searchText.toLowerCase().includes(query);
      if (!row.hidden) matches++;
    }
    count.textContent = query
      ? `${matches} of ${rows.length} incidents`
      : `${rows.length} incidents`;
    clear.hidden = search.value.length === 0;
    noResults.hidden = matches !== 0;
  }
  search.addEventListener('input', filterQueue);
  clear.addEventListener('click', () => {
    search.value = '';
    filterQueue();
    search.focus();
  });
  filterQueue();
}
