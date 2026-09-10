// Verify browser guard behavior with two owned loopback servers; never contact the Internet.
import { createServer } from 'node:http';
import { runAcceptance, viewports } from './browser.mjs';

async function listen(handler) {
  const server = createServer(handler);
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  return { server, origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(done => { server.close(done); server.closeAllConnections(); }) };
}

export async function checkBrowserBoundaries(browser, output) {
  let received = 0;
  const sink = await listen((_, response) => { received++; response.end('unexpected request'); });
  sink.server.on('upgrade', (_, socket) => { received++; socket.destroy(); });
  const results = [];
  try {
    for (const kind of ['opt-in', 'off-origin', 'redirect', 'websocket', 'popup']) {
      let actions = 0;
      received = 0;
      const app = await listen((request, response) => {
        if (request.url === '/redirect') { response.writeHead(302, { Location: `${sink.origin}/probe` }).end(); return; }
        if (request.url === '/favicon.ico') { response.writeHead(204).end(); return; }
        response.setHeader('Content-Type', 'text/html');
        const script = request.url === '/popup' ? '' : {
          'opt-in': '', 'off-origin': `fetch('${sink.origin}/probe').catch(() => {});`,
          redirect: "fetch('/redirect').catch(() => {});", websocket: `new WebSocket('${sink.origin.replace('http:', 'ws:')}/probe');`,
          popup: "window.open('/popup');",
        }[kind];
        response.end(`<!doctype html><html><head>${kind === 'opt-in' ? '' : '<meta name="styleseed-pilot-protocol" content="1">'}</head><body><main><h1>Boundary fixture</h1></main><script>${script}</script></body></html>`);
      });
      try {
        const run = await runAcceptance({ browser, baseUrl: app.origin, output, label: `boundary-${kind}`,
          selectedScenarios: [{ id: kind, path: '/resources', run: async () => { actions++; } }], selectedViewports: [viewports[0]] });
        const expected = { 'opt-in': 'Missing explicit', 'off-origin': 'Off-origin', redirect: 'Off-origin', websocket: 'WebSocket', popup: 'Unexpected popup' }[kind];
        results.push({ id: kind, status: run.status === 'fail' && run.cases[0].environment.some(message => message.includes(expected))
          && !run.cases[0].assertion && actions === 0 && received === 0 ? 'pass' : 'fail', actionsExecuted: actions, sinkRequests: received, evidence: run });
      } finally { await app.close(); }
    }
  } finally { await sink.close(); }
  return { status: results.every(result => result.status === 'pass') ? 'pass' : 'fail', results };
}
