import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const within = (root, path) => {
  const rel = relative(root, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

export function localOrigin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Expected an explicit local HTTP origin'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash || !/^http:\/\/127\.0\.0\.1:\d+\/?$/u.test(value)) {
    throw new Error('Only http://127.0.0.1:<port> without credentials, path, query or fragment is allowed');
  }
  return url.origin;
}

export function freshOutput(repo, output) {
  const proposed = output ? resolve(output) : null;
  const parent = realpathSync(proposed ? dirname(proposed) : tmpdir());
  const target = proposed ? join(parent, basename(proposed)) : parent;
  if (within(realpathSync(repo), target)) throw new Error('Browser evidence must be outside the source checkout');
  if (proposed) { mkdirSync(target, { mode: 0o700 }); return target; }
  return mkdtempSync(join(parent, 'styleseed-pilot-browser-'));
}

export function writeReport(output, report) {
  writeFileSync(join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
}

export function sourceInventory(root, paths) {
  return [...paths].sort().map(path => {
    const absolute = resolve(root, path);
    if (!within(root, absolute)) throw new Error('Source inventory escape');
    let cursor = root;
    for (const part of relative(root, absolute).split(sep)) {
      cursor = join(cursor, part);
      if (lstatSync(cursor).isSymbolicLink()) throw new Error(`Refusing source symlink: ${path}`);
    }
    const stat = lstatSync(absolute);
    if (!stat.isFile() || stat.nlink !== 1) throw new Error(`Refusing unsafe source: ${path}`);
    const bytes = readFileSync(absolute);
    return { path, bytes: bytes.length, sha256: sha256(bytes) };
  });
}
