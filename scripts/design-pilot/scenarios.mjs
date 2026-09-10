import assert from 'node:assert/strict';

const text = async (locator, expected) => {
  await locator.filter({ hasText: expected }).waitFor({ state: 'visible' });
  const actual = (await locator.textContent()).trim();
  if (typeof expected === 'string') assert.equal(actual, expected); else assert.match(actual, expected);
};
const row = (page, id) => page.locator(`[data-resource-id="${id}"]`);
const fieldStatus = (page, id) => row(page, id).locator('[data-field=status]');
const select = (page, name) => page.getByRole('checkbox', { name: `Select ${name}`, exact: true }).check();
const pauseDialog = async page => {
  await page.getByRole('button', { name: 'Pause selected', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Pause resources', exact: true });
  await dialog.waitFor(); return dialog;
};
const confirm = async page => (await pauseDialog(page)).getByRole('button', { name: 'Confirm pause', exact: true }).click();
const save = page => page.getByRole('button', { name: 'Save settings', exact: true }).click();
const nameInput = page => page.getByLabel('Workspace name', { exact: true });
const daysInput = page => page.getByLabel('Retention days', { exact: true });
const nav = (page, name) => page.getByRole('navigation', { name: 'Primary', exact: true }).getByRole('link', { name, exact: true });
const open = (page, name) => page.getByRole('link', { name, exact: true }).click();
const isInvalid = async locator => {
  assert.equal(await locator.getAttribute('aria-invalid'), 'true', 'Invalid input must be marked');
  assert.equal(await locator.evaluate(input => (input.getAttribute('aria-describedby') || '').split(/\s+/u)
    .some(id => document.getElementById(id)?.textContent.trim())), true, 'Input must reference a non-empty error message');
};

export const scenarios = [
  { id: 'list-search', path: '/resources', run: async page => {
    assert.equal(await page.locator('[data-resource-id]').count(), 4);
    const search = page.getByLabel('Search resources', { exact: true });
    await search.fill('  PLATFORM  ');
    assert.equal(await page.locator('[data-resource-id]').count(), 2, 'Owner search trims and ignores case');
    await page.getByLabel('Status filter', { exact: true }).selectOption('active');
    assert.equal(await page.locator('[data-resource-id]').count(), 1);
    await text(row(page, 'res-101'), /Payments API/u);
    await search.fill('RES-102'); await text(row(page, 'res-102'), /Search index/u);
    await search.fill('audit EXPORTER'); await text(row(page, 'res-104'), /Audit exporter/u);
    await search.fill('not-present'); await text(page.getByTestId('no-results'), /.+/u);
    assert.equal(await page.getByTestId('empty-dataset').count(), 0);
  } },
  { id: 'list-selection', path: '/resources', run: async page => {
    await select(page, 'Search index'); await text(page.getByTestId('selected-count'), '1');
    await page.getByLabel('Search resources', { exact: true }).fill('Security');
    await text(page.getByTestId('selected-count'), '0');
    await page.getByRole('checkbox', { name: 'Select all visible', exact: true }).check();
    await text(page.getByTestId('selected-count'), '1');
    assert.equal(await page.getByRole('checkbox', { name: 'Select Audit exporter', exact: true }).isChecked(), true);
    await page.getByLabel('Status filter', { exact: true }).selectOption('paused');
    await text(page.getByTestId('selected-count'), '0');
    await page.getByLabel('Search resources', { exact: true }).fill('');
    await page.getByLabel('Status filter', { exact: true }).selectOption('all');
    await page.getByRole('checkbox', { name: 'Select all visible', exact: true }).check();
    await text(page.getByTestId('selected-count'), '4');
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await text(page.getByTestId('selected-count'), '0');
  } },
  { id: 'bulk-cancel', path: '/resources', run: async page => {
    await select(page, 'Search index'); await select(page, 'Audit exporter');
    const dialog = await pauseDialog(page);
    await text(dialog, /Search index/u); await text(dialog, /Audit exporter/u); await text(dialog, /2/u);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await text(fieldStatus(page, 'res-102'), 'active'); await text(fieldStatus(page, 'res-104'), 'active');
    await text(page.getByTestId('selected-count'), '2');
    await pauseDialog(page); await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await text(page.getByTestId('selected-count'), '2');
  } },
  { id: 'bulk-atomic', path: '/resources', run: async page => {
    await select(page, 'Payments API'); await select(page, 'Search index'); await confirm(page);
    await text(page.getByRole('alert'), /protect/iu);
    await text(fieldStatus(page, 'res-101'), 'active'); await text(fieldStatus(page, 'res-102'), 'active');
    await page.getByRole('button', { name: 'Clear selection', exact: true }).click();
    await select(page, 'Digest worker'); await select(page, 'Search index'); await confirm(page);
    await text(page.getByRole('alert'), /active|paused/iu); await text(fieldStatus(page, 'res-102'), 'active');
  } },
  { id: 'viewer-bulk', path: '/resources?role=viewer', run: async page => {
    await select(page, 'Search index');
    assert.equal(await page.getByRole('button', { name: 'Pause selected', exact: true }).isDisabled(), true, 'Viewer cannot bulk pause');
    await text(page.getByTestId('permission-reason'), /viewer|permission/iu);
    await text(fieldStatus(page, 'res-102'), 'active');
  } },
  { id: 'bulk-shared-state', path: '/resources', run: async page => {
    await select(page, 'Search index'); await confirm(page);
    await text(fieldStatus(page, 'res-102'), 'paused'); await text(fieldStatus(page, 'res-104'), 'active');
    await text(page.getByRole('status'), /paused/iu);
    await open(page, 'Search index'); await text(page.getByTestId('resource-status'), 'paused');
    const history = await page.getByTestId('resource-history').textContent();
    assert.ok(history.indexOf('Resource activated') >= 0 && history.indexOf('Resource paused') > history.indexOf('Resource activated'), 'History preserves chronological mutation evidence');
    await open(page, 'Back to resources'); await text(fieldStatus(page, 'res-102'), 'paused');
  } },
  { id: 'detail-context', path: '/resources', run: async page => {
    await page.getByLabel('Search resources', { exact: true }).fill('Security');
    await page.getByLabel('Status filter', { exact: true }).selectOption('active');
    await open(page, 'Audit exporter'); await text(page.getByTestId('resource-history'), /No history/iu);
    await open(page, 'Back to resources');
    assert.equal(await page.getByLabel('Search resources', { exact: true }).inputValue(), 'Security');
    assert.equal(await page.getByLabel('Status filter', { exact: true }).inputValue(), 'active');
    assert.equal(await page.locator('[data-resource-id]').count(), 1);
  } },
  { id: 'detail-fields', path: '/resources/res-101?role=viewer', run: async page => {
    await text(page.getByRole('heading', { name: 'Payments API', exact: true }), 'Payments API');
    await text(page.getByTestId('resource-status'), 'active'); await text(page.getByTestId('resource-owner'), 'Platform');
    await text(page.getByTestId('resource-protection'), /^Protected$/u);
    await text(page.getByTestId('resource-history'), /Protection enabled/u);
    await text(page.getByTestId('permission-reason'), /viewer|permission/iu);
  } },
  { id: 'detail-unknown', path: '/resources/res-unknown', run: async page => {
    await text(page.getByRole('alert'), /not found|unknown/iu);
    await open(page, 'Back to resources'); await text(row(page, 'res-102'), /Search index/u);
  } },
  { id: 'history-unavailable', path: '/resources/res-102?fixture=history-unavailable', run: async page => {
    await text(page.getByTestId('resource-history'), /unavailable/iu); await text(page.getByTestId('resource-status'), 'active');
  } },
  ...['list', 'detail'].flatMap(kind => {
    const path = kind === 'list' ? '/resources' : '/resources/res-102';
    return [
      { id: `${kind}-loading`, path: `${path}?fixture=${kind}-loading`, run: page => text(page.getByRole('status'), /loading/iu) },
      { id: `${kind}-retry`, path: `${path}?fixture=${kind}-error`, run: async page => {
        await text(page.getByRole('alert'), /.+/u);
        await page.getByRole('button', { name: 'Retry', exact: true }).click();
        if (kind === 'list') await text(row(page, 'res-102'), /Search index/u);
        else await text(page.getByTestId('resource-status'), 'active');
        assert.equal(await page.getByRole('alert').count(), 0, 'Retry clears the request error');
      } },
    ];
  }),
  { id: 'list-empty', path: '/resources?fixture=empty', run: async page => {
    await text(page.getByTestId('empty-dataset'), /.+/u);
    assert.equal(await page.locator('[data-resource-id]').count(), 0);
    assert.equal(await page.getByTestId('no-results').count(), 0);
  } },
  { id: 'settings-labels', path: '/settings', run: async page => {
    await nameInput(page).waitFor(); await daysInput(page).waitFor(); await page.getByLabel('Digest frequency', { exact: true }).waitFor();
    assert.equal(await nameInput(page).evaluate(input => [...input.labels].some(label => label.textContent.trim().length > 0)), true, 'Visible input label is required');
  } },
  { id: 'settings-validation', path: '/settings', run: async page => {
    for (const name of [' ', 'x', 'x'.repeat(41)]) {
      await nameInput(page).fill(name); await save(page); await isInvalid(nameInput(page));
      assert.equal(await nameInput(page).inputValue(), name, 'Validation retains invalid input');
    }
    await nameInput(page).fill('Valid workspace');
    for (const days of ['', '6', '91', '7.5', '1e1']) {
      await daysInput(page).fill(days); await save(page); await isInvalid(daysInput(page));
      assert.equal(await daysInput(page).inputValue(), days);
    }
    await daysInput(page).fill('7'); await page.getByLabel('Digest frequency', { exact: true }).selectOption('off');
    await save(page); await text(page.getByRole('status'), /saved/iu);
    await text(page.getByTestId('unsaved'), 'No unsaved changes');
    await daysInput(page).fill('90'); await save(page); await text(page.getByRole('status'), /saved/iu);
  } },
  { id: 'settings-retry', path: '/settings?fixture=save-failure', run: async page => {
    await nameInput(page).fill('  Retained workspace  '); await daysInput(page).fill('45');
    await page.getByLabel('Digest frequency', { exact: true }).selectOption('weekly'); await save(page);
    await text(page.getByRole('alert'), /fail/iu);
    assert.equal(await nameInput(page).inputValue(), '  Retained workspace  '); assert.equal(await daysInput(page).inputValue(), '45');
    assert.equal(await page.getByLabel('Digest frequency', { exact: true }).inputValue(), 'weekly');
    await text(page.getByTestId('unsaved'), 'Unsaved changes');
    await page.getByLabel('Save outcome', { exact: true }).selectOption('success'); await save(page);
    await text(page.getByRole('status'), /saved/iu); await text(page.getByTestId('unsaved'), 'No unsaved changes');
    assert.equal(await nameInput(page).inputValue(), 'Retained workspace');
    await nav(page, 'Resources').click(); await nav(page, 'Settings').click();
    assert.equal(await nameInput(page).inputValue(), 'Retained workspace'); assert.equal(await daysInput(page).inputValue(), '45');
  } },
  { id: 'settings-saving', path: '/settings', run: async page => {
    await nameInput(page).fill('Saving workspace'); await save(page); await text(page.getByRole('status'), /saving/iu);
    assert.equal(await page.getByRole('button', { name: 'Save settings', exact: true }).isDisabled(), true, 'Pending save disables duplicate submission');
    await text(page.getByRole('status'), /saved/iu);
  } },
  { id: 'viewer-settings', path: '/settings?role=viewer', run: async page => {
    await nameInput(page).fill('Local viewer draft');
    assert.equal(await page.getByRole('button', { name: 'Save settings', exact: true }).isDisabled(), true, 'Viewer cannot save');
    await text(page.getByTestId('permission-reason'), /viewer|permission/iu);
    await text(page.getByTestId('unsaved'), 'Unsaved changes');
  } },
  { id: 'settings-navigation', path: '/settings', run: async page => {
    await nameInput(page).fill('Last saved workspace'); await save(page); await text(page.getByRole('status'), /saved/iu);
    await nameInput(page).fill('Discard this draft'); await nav(page, 'Resources').click();
    const dialog = page.getByRole('dialog', { name: 'Discard changes?', exact: true }); await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Stay', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/settings'); assert.equal(await nameInput(page).inputValue(), 'Discard this draft');
    await nav(page, 'Resources').click(); await dialog.getByRole('button', { name: 'Discard', exact: true }).click();
    assert.equal(new URL(page.url()).pathname, '/resources'); await nav(page, 'Settings').click();
    assert.equal(await nameInput(page).inputValue(), 'Last saved workspace'); await text(page.getByTestId('unsaved'), 'No unsaved changes');
  } },
  { id: 'keyboard', path: '/resources', run: async page => {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body) return false;
      const style = getComputedStyle(element);
      return element.matches(':focus-visible') && ((style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none');
    }), true, 'Keyboard entry has visible focus');
    await nav(page, 'Settings').focus(); await page.keyboard.press('Enter');
    await text(page.getByRole('heading', { name: 'Settings', exact: true }), 'Settings');
  } },
  { id: 'layout', path: '/resources', run: async page => {
    for (const path of ['/resources', '/resources/res-102', '/settings']) {
      await page.goto(new URL(path, page.url()).href, { waitUntil: 'networkidle' });
      await page.locator('main h1').waitFor();
      const failures = await page.evaluate(() => {
        const failed = [];
        const width = document.documentElement.clientWidth;
        if (document.documentElement.scrollWidth > width + 1 || document.body.scrollWidth > width + 1) failed.push('document overflow');
        for (const node of document.querySelectorAll('a,button,input,select')) {
          const target = node.matches('input[type=checkbox]') ? node.closest('label') || node : node;
          const box = target.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          if (box.width < 43.5 || box.height < 43.5) failed.push(`small target: ${node.getAttribute('aria-label') || node.textContent || node.id}`);
        }
        return failed;
      });
      assert.deepEqual(failures, [], `${path} has no document overflow or undersized targets`);
    }
  } },
  { id: 'reduced-motion', path: '/resources', reducedOnly: true, run: async page => {
    assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
    for (const path of ['/resources', '/resources/res-102', '/settings']) {
      await page.goto(new URL(path, page.url()).href, { waitUntil: 'networkidle' });
      await page.locator('main h1').waitFor();
      const animations = await page.evaluate(() => document.getAnimations().filter(animation => {
        const timing = animation.effect?.getComputedTiming();
        return animation.playState === 'running' && timing && (timing.iterations === Infinity || Number(timing.duration) > 500);
      }).length);
      assert.equal(animations, 0, 'Reduced motion must suppress long or infinite animation');
    }
  } },
];
