// The shipped controls as rows of markup, and the product-looking page built from them, for the browser fixtures
// that measure control heights: scripts/test-control-height-browser.mjs (WO-17: every height hangs off
// --ss-control-height) and scripts/test-system-css-browser.mjs (WO-20 B2: the height .styleseed/system.css sets).
// Both fixtures run on import, so neither can import the other; they share this module. The class strings are
// read from the component sources (the same reads the fixtures made before), so a changed component changes the
// rows. Fictional fixture copy. A measurement regression fixture, not a design judgment.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSource, themeColors } from '../build-component-contracts.mjs';

const repoRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const read = path => readFileSync(resolve(repoRoot, path), 'utf8');
const colours = themeColors();

// --- the shipped class strings, read from the sources ------------------------------------------------------

export const matches = (path, pattern, count) => {
  const found = [...read(path).matchAll(pattern)];
  assert.equal(found.length, count, `${path}: expected ${count} match(es) of ${pattern}; the fixture reads the shipped class strings from it`);
  return found;
};
const button = parseSource(read('engine/components/ui/button.tsx'), colours).cvas.buttonVariants;
export const buttonClass = (size, variant = 'default') => `${button.base} ${button.variants.variant[variant]} ${button.variants.size[size]}`;
const toggle = parseSource(read('engine/components/ui/toggle.tsx'), colours).cvas.toggleVariants;
export const toggleClass = size => `${toggle.base} ${toggle.variants.variant.outline} ${toggle.variants.size[size]}`;
export const input = parseSource(read('engine/components/ui/input.tsx'), colours).parts.find(part => part.slot === 'input').classes;
export const trigger = matches('engine/components/ui/select.tsx', /"([^"]*data-\[size=default\]:[^"]*)"/gu, 1)[0][1];
export const [segPadding, segHeight] = matches('engine/components/ui/segmented-control.tsx', /size === "sm"\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/gu, 2).map(m => ({ sm: m[1], md: m[2] }));
export const segRoot = matches('engine/components/ui/segmented-control.tsx', /"(ss-pattern-control flex items-center[^"]*)"/gu, 1)[0][1];
export const segButton = matches('engine/components/ui/segmented-control.tsx', /"(ss-pattern-control flex-1[^"]*)"/gu, 1)[0][1];
export const [segOn, segOff] = matches('engine/components/ui/segmented-control.tsx', /isActive\s*\?\s*"([^"]+)"\s*:\s*"([^"]+)"/gu, 1)[0].slice(1);
export const tabsList = matches('engine/components/ui/tabs.tsx', /"(ss-pattern-control bg-muted[^"]*)"/gu, 1)[0][1];
export const tabsTrigger = matches('engine/components/ui/tabs.tsx', /"(ss-pattern-control data-\[state=active\][^"]*)"/gu, 1)[0][1];
export const confirm = matches('engine/components/ui/confirm-modal.tsx', /"(ss-pattern-control flex-1[^"]*)"/gu, 2).map(m => m[1]);
export const drawerClose = matches('engine/components/ui/drawer.tsx', /<button\s+onClick=\{onClose\}\s+className="([^"]+)"/gu, 1)[0][1];
export const topBarAction = matches('engine/components/patterns/top-bar.tsx', /data-slot="top-bar-action"\s+className=\{cn\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/gu, 1)[0].slice(1).join(' ');
export const card = matches('engine/components/ui/card.tsx', /"(ss-component-surface[^"]*)"/gu, 1)[0][1];

export const icon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>';
export const segmented = (c, size, track) => `<div ${track ? `data-row="${c}" ` : ''}data-slot="segmented-control" class="${segRoot} ${segPadding[size]}"><button ${track ? '' : `data-row="${c}" `}class="${segButton} ${segHeight[size]} ${segOn}">Week</button><button ${track ? '' : `data-row="${c}" `}class="${segButton} ${segHeight[size]} ${segOff}">Month</button></div>`;

// --- the rows -------------------------------------------------------------------------------------------------

// id, the offset from D (WO-17 A2 as changed by B1), whether it is one of the controls that share the default
// height, whether it is square (size-[…]) or carries a min-width, and its markup (`c` is the value of its
// data-row attribute). `today` is its px at D = 40. Every row is D + its offset.
export const ROWS = [
  { id: 'button-xs', offset: -8, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('xs')}">Export</button>` },
  { id: 'button-sm', offset: -4, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('sm')}">Export list</button>` },
  { id: 'button-md', offset: 0, shared: true, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('md')}">Save changes</button>` },
  { id: 'button-lg', offset: 12, html: c => `<button data-row="${c}" data-slot="button" class="${buttonClass('lg')}">Place order</button>` },
  { id: 'button-icon', offset: 0, square: true, html: c => `<button data-row="${c}" data-slot="button" aria-label="Close" class="${buttonClass('icon')}">${icon}</button>` },
  { id: 'input', offset: 0, shared: true, html: c => `<input data-row="${c}" data-slot="input" type="text" value="Berth nine" aria-label="Berth" class="${input}">` },
  ...[['default', 0, true], ['sm', -4, false]].map(([size, offset, shared]) => ({ id: `select-${size}`, offset, shared, html: c => `<button data-row="${c}" type="button" role="combobox" aria-expanded="false" data-slot="select-trigger" data-size="${size}" class="${trigger}"><span data-slot="select-value">Harbour east</span><svg class="size-4 opacity-50" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg></button>` })),
  // The segment carries the height; the track adds its padding (p-1 default, p-0.5 sm). The default track is D.
  { id: 'segmented-default-segment', offset: -8, html: c => segmented(c, 'md', false) },
  { id: 'segmented-default-track', offset: 0, shared: true, html: c => segmented(c, 'md', true) },
  { id: 'segmented-sm-segment', offset: -12, html: c => segmented(c, 'sm', false) },
  { id: 'segmented-sm-track', offset: -8, html: c => segmented(c, 'sm', true) },
  ...[['default', 0, true], ['sm', -4, false], ['lg', 4, false]].map(([size, offset, shared]) => ({ id: `toggle-${size}`, offset, shared, minWidth: true, html: c => `<button data-row="${c}" data-slot="toggle" aria-pressed="false" class="${toggleClass(size)}">B</button>` })),
  { id: 'tabs-list', offset: 0, shared: true, html: c => `<div data-row="${c}" role="tablist" data-slot="tabs-list" class="${tabsList}"><button role="tab" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button role="tab" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>` },
  { id: 'confirm-modal', offset: 4, html: c => `<div class="flex w-80 gap-2"><button data-row="${c}" class="${confirm[0]}">Close</button><button data-row="${c}" class="${confirm[1]} bg-brand">Confirm</button></div>` },
  { id: 'drawer-close', offset: -8, square: true, html: c => `<button data-row="${c}" aria-label="Close" class="${drawerClose}">${icon}</button>` },
  { id: 'top-bar-action', offset: 0, square: true, html: c => `<button data-row="${c}" data-slot="top-bar-action" aria-label="Alerts" class="${topBarAction}">${icon}</button>` },
].map(row => ({ ...row, today: 40 + row.offset }));
// Every row in its own padded cell, the way both fixtures lay them out.
export const rowsHtml = () => ROWS.map(row => `<div class="p-2">${row.html(row.id)}</div>`).join('\n');

// --- the product-looking page (page 7 of the control-height fixture) ---------------------------------------

// A screen the drift report reads like a product's: a skin theme gives buttons a visible box (the probe counts boxed
// buttons only); the roles Radix writes keep the active tab trigger from reading as a button; the toggles are pressed
// and outlined. `htmlAttributes` goes on <html> (for example ` data-styleseed-recipe="enterprise-workbench"`),
// `stylesheet` is the href of its one stylesheet.
const selectHtml = size => `<button type="button" role="combobox" aria-expanded="false" aria-autocomplete="none" data-slot="select-trigger" data-size="${size}" class="${trigger}"><span data-slot="select-value">Harbour east</span><svg class="size-4" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" stroke="currentColor" fill="none"/></svg></button>`;
const productBody = `<div class="p-6 flex flex-col gap-4">
 <div class="flex items-end gap-3"><input type="text" data-slot="input" class="${input}" value="Berth nine" aria-label="Berth">${selectHtml('default')}${selectHtml('sm')}</div>
 <div class="flex gap-2">${['xs', 'sm', 'md', 'lg'].map(size => `<button data-slot="button" class="${buttonClass(size)}">Save ${size}</button>`).join('')}<button data-slot="button" aria-label="Add" class="${buttonClass('icon', 'outline')}">${icon}</button></div>
 ${segmented('drift', 'md', false).replaceAll(' data-row="drift"', '')}
 ${segmented('drift', 'sm', false).replaceAll(' data-row="drift"', '')}
 <div class="flex gap-2">${['default', 'sm', 'lg'].map(size => `<button type="button" aria-pressed="true" data-state="on" data-slot="toggle" class="${toggleClass(size)}">Bold ${size}</button>`).join('')}</div>
 <div role="tablist" data-slot="tabs-list" class="${tabsList}"><button role="tab" aria-selected="true" data-state="active" data-slot="tabs-trigger" class="${tabsTrigger}">Arrivals</button><button role="tab" aria-selected="false" data-state="inactive" data-slot="tabs-trigger" class="${tabsTrigger}">Departures</button></div>
 <div class="flex gap-2 w-full"><button class="${confirm[0]}">Close</button><button class="${confirm[1]} bg-brand">Delete</button></div>
 <div class="flex gap-2"><button aria-label="Close" class="${drawerClose}">${icon}</button><button data-slot="top-bar-action" aria-label="Alerts" class="${topBarAction}">${icon}</button></div>
</div>`;
export const productPage = ({ htmlAttributes, stylesheet }) => `<!doctype html><html lang="en"${htmlAttributes}><head><meta charset="utf-8"><title>Billing details</title><link rel="stylesheet" href="${stylesheet}"></head><body class="bg-surface-page"><main class="mx-auto max-w-[960px] p-8"><h1 class="text-[24px] font-bold text-text-primary">Billing details</h1><section data-slot="card" class="${card} mt-6">${productBody}</section></main></body></html>`;
