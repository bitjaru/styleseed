// Deliberately plain DOM test double. Not a React/library adoption or design-quality example.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const mutations = Object.freeze({
  'selection-leak': 'list-selection',
  'ignore-cancel': 'bulk-cancel',
  'partial-update': 'bulk-atomic',
  'viewer-bulk': 'viewer-bulk',
  'stale-detail': 'bulk-shared-state',
  'filter-lost': 'detail-context',
  'save-loss': 'settings-retry',
  'invalid-save': 'settings-validation',
  'viewer-save': 'viewer-settings',
  'dirty-navigation': 'settings-navigation',
  'duplicate-save': 'settings-saving',
  'hidden-error': 'list-retry',
  'overflow': 'layout',
  'motion': 'reduced-motion',
  'missing-label': 'settings-labels',
});

export async function startCalibrationServer({ mutation = null } = {}) {
  if (mutation !== null && !Object.hasOwn(mutations, mutation)) throw new Error('Unknown calibration mutation');
  const resources = new Map([
    ['/app.mjs', ['text/javascript', new URL('../../research/design-judgment/operator/calibration/app.mjs', import.meta.url)]],
    ['/model.mjs', ['text/javascript', new URL('../../research/design-judgment/common/model.mjs', import.meta.url)]],
    ['/fixtures.json', ['application/json', new URL('../../research/design-judgment/common/fixtures.json', import.meta.url)]],
  ]);
  const html = readFileSync(new URL('../../research/design-judgment/operator/calibration/index.html', import.meta.url), 'utf8')
    .replace('CALIBRATION_CONFIG', JSON.stringify({ mutation }));
  const payloads = new Map([...resources].map(([path, [type, url]]) => [path, { type, bytes: readFileSync(fileURLToPath(url)) }]));
  const server = createServer((request, response) => {
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    response.setHeader('Cache-Control', 'no-store');
    const file = payloads.get(path);
    if (file) { response.setHeader('Content-Type', file.type); response.end(file.bytes); return; }
    if (path === '/favicon.ico') { response.writeHead(204).end(); return; }
    if (path === '/resources' || path === '/settings' || /^\/resources\/[a-z0-9-]+$/u.test(path)) {
      response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return;
    }
    response.writeHead(404).end('Not found');
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done, reject) => { server.close(error => error ? reject(error) : done()); server.closeAllConnections(); }),
  };
}
