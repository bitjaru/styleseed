import { mkdirSync, copyFileSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const root = dirname(fileURLToPath(import.meta.url));
const out = resolve(root, 'dist');
mkdirSync(out, { recursive: true });
for (const file of readdirSync(resolve(root, 'src')))
    copyFileSync(resolve(root, 'src', file), resolve(out, file));
copyFileSync(resolve(root, '.styleseed/palettes/project-list.css'), resolve(out, 'palette.css'));
copyFileSync(resolve(root, '.styleseed/project.json'), resolve(out, 'project.json'));
for (const id of ['project-list', 'project-detail'])
    copyFileSync(resolve(root, `.styleseed/bundles/${id}.md`), resolve(out, `${id}.md`));
const hashes = Object.fromEntries(readdirSync(resolve(root, 'src')).map(file => [file, createHash('sha256').update(readFileSync(resolve(root, 'src', file))).digest('hex')]));
writeFileSync(resolve(out, 'provenance.json'), JSON.stringify({ case: 'StyleSeed wanted submission example', data: 'fictional local sample data', humanAcceptance: false, freshSessionReuse: false, sourceHashes: hashes }, null, 2) + '\n');
console.log(`Built ${out}`);
