#!/usr/bin/env node
// Propose system values with their basis (WO-11 A5). For control height, type sizes, corner radius, table
// row height, and spacing unit (and the other ledger axes when they have a basis) it prints a value and the
// counts behind it, strongest basis first: the project's recorded decision, the person's own measured
// references, counts over the measured design systems in the evidence pack, and the engine default,
// labelled not measured. Each block carries a ready ledger entry with `approvedBy` and `date` empty: it
// does not compile until the person who decides gives their name. The tool never writes the ledger.
//
//   node propose-system.mjs --project-root <dir> --surface pointer|touch [--artifact <id>] [--page <id>]
//                           [--reference <slug>]… [--write | --json]
//   node propose-system.mjs --project-root <dir> --surface … [same inputs] --entry <axis>=<v1,v2,…>
//   node propose-system.mjs --engine-defaults [--page <id>]
//
// Default: SYSTEM.md on stdout, nothing written. --json: the proposal object on stdout. --write:
// .styleseed/proposals/system.json and .styleseed/proposals/SYSTEM.md, then one line per axis. --entry: the
// entry for a value set the person chose, on stdout; writes nothing. --engine-defaults: what the engine
// ships beside the corpus rows; needs no project. Exit 0 on success, 1 on any error.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SAFE_ID, normalizeDecisions, parseStrictJson, safeProjectPath } from "./runtime-contract.mjs";
import { loadProjectRegistry } from "./project-registry.mjs";
import { isApproved, isGeneratedEvidence, normalizeReferenceEvidence } from "./reference-contract.mjs";
import { PROPOSAL_AXES, engineDefaultsTable, entryForValues, normalizeEngineDefaults, normalizeEvidencePack, proposeSystem, referenceValues, renderEngineDefaultsMarkdown, renderProposalMarkdown } from "./system-proposal.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const REFERENCES = resolve(scriptDir, "../references");
const LEDGER_FILE = ".styleseed/decisions.json";
const PROPOSALS_DIR = ".styleseed/proposals";
const USAGE = `usage: propose-system.mjs --project-root <dir> --surface pointer|touch [--artifact <id>] [--page <id>] [--reference <slug>]… [--write | --json]
       propose-system.mjs --project-root <dir> --surface pointer|touch [same inputs] --entry <axis>=<v1,v2,…>
       propose-system.mjs --engine-defaults [--page <id>]`;
const REBUILD = "rebuild with `node scripts/build-evidence-pack.mjs`, or reinstall the skill";

export function parseArgs(argv) {
  const args = { projectRoot: null, surface: null, artifact: null, page: null, references: [], write: false, json: false, entry: null, engineDefaults: false, help: false };
  const value = (i, flag) => { const next = argv[i + 1]; if (next === undefined || next.startsWith("--")) throw new Error(`${flag} needs a value\n${USAGE}`); return next; };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--project-root") args.projectRoot = value(i++, arg);
    else if (arg === "--surface") args.surface = value(i++, arg);
    else if (arg === "--artifact") args.artifact = value(i++, arg);
    else if (arg === "--page") args.page = value(i++, arg);
    else if (arg === "--reference") args.references.push(value(i++, arg));
    else if (arg === "--entry") args.entry = value(i++, arg);
    else if (arg === "--write") args.write = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--engine-defaults") args.engineDefaults = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`unknown argument ${arg}\n${USAGE}`);
  }
  if (args.help) return args;
  if (args.engineDefaults) {
    const extra = [args.projectRoot && "--project-root", args.surface && "--surface", args.artifact && "--artifact", args.references.length && "--reference", args.write && "--write", args.json && "--json", args.entry && "--entry"].filter(Boolean);
    if (extra.length) throw new Error(`--engine-defaults reads only the skill's files and takes --page alone; drop ${extra.join(", ")}`);
    return args;
  }
  if (!args.projectRoot) throw new Error(`pass --project-root <dir>: the project folder that holds STYLESEED.md or .styleseed/project.json\n${USAGE}`);
  if (!args.surface) throw new Error("pass --surface pointer (mouse or trackpad first) or --surface touch (touch first): the corpus was measured with pointer input only");
  if (!["pointer", "touch"].includes(args.surface)) throw new Error(`--surface ${args.surface}: pass --surface pointer (mouse or trackpad first) or --surface touch (touch first)`);
  if (args.write && args.json) throw new Error("--write and --json are separate outputs; pass one of them");
  if (args.entry !== null && (args.write || args.json)) throw new Error("--entry prints one entry and writes nothing; drop --write and --json");
  if (args.artifact !== null && !SAFE_ID.test(args.artifact)) throw new Error(`--artifact ${args.artifact}: not an artifact id (lower-case letters, digits, and hyphens)`);
  for (const slug of args.references) if (!SAFE_ID.test(slug)) throw new Error(`--reference ${slug}: not a reference slug (lower-case letters, digits, and hyphens, as passed to measure-reference.mjs --slug)`);
  if (new Set(args.references).size !== args.references.length) throw new Error("--reference: each slug once");
  return args;
}

function readSkillJson(name) {
  const path = resolve(REFERENCES, name);
  const label = `ss-resolve/references/${name}`;
  if (!existsSync(path)) throw new Error(`${label} is missing; ${REBUILD}`);
  try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { throw new Error(`${label} is not valid JSON (${error.message}); ${REBUILD}`); }
}
function loadSkillData() {
  const pack = normalizeEvidencePack(readSkillJson("evidence-pack.json"), { file: "ss-resolve/references/evidence-pack.json" });
  const defaults = normalizeEngineDefaults(readSkillJson("engine-defaults.json"), { file: "ss-resolve/references/engine-defaults.json" });
  const catalog = readSkillJson("catalog.json");
  if (!catalog || typeof catalog.pages !== "object") throw new Error("ss-resolve/references/catalog.json has no pages; reinstall the skill");
  return { pack, defaults, catalog };
}
function checkPage(page, catalog) {
  if (page === "none" || Object.hasOwn(catalog.pages, page)) return page;
  throw new Error(`--page ${page}: not a page type of the catalog (${Object.keys(catalog.pages).join(", ")}, or none)`);
}

const readProjectJson = (root, relative) => {
  const path = safeProjectPath(root, relative);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { throw new Error(`${relative} is not valid JSON (${error.message}); measure or resolve again`); }
};

function lockDensity(root) {
  const path = safeProjectPath(root, "STYLESEED.md");
  if (!existsSync(path)) return null;
  const line = readFileSync(path, "utf8").split(/\r?\n/u).find((text) => /^\s*-\s+Density:/u.test(text));
  if (!line) return null;
  const value = line.replace(/^\s*-\s+Density:\s*/u, "").replace(/\s+#.*$/u, "").trim();
  return /^[A-Za-z][A-Za-z -]{0,39}$/u.test(value) ? value : null;
}

// The project: its ledger, density, and compiled selection.
export function loadProject(projectRoot, catalog, { artifact = null } = {}) {
  const root = resolve(projectRoot);
  if (!existsSync(root)) throw new Error(`--project-root ${projectRoot}: the folder does not exist`);
  const registry = loadProjectRegistry(root, { catalog });
  let mode, decisions, density, manifestPath, artifactId = null, ledgerPath, resolveCommand;
  if (registry) {
    if (existsSync(safeProjectPath(root, LEDGER_FILE))) throw new Error(`${LEDGER_FILE} is the ledger of a project without a registry, and this project has one. Move its entries into \`decisions\` in .styleseed/project.json and delete the file.`);
    const ids = registry.artifacts.map((entry) => entry.id).sort();
    if (artifact) {
      if (!registry.artifactMap.has(artifact)) throw new Error(`--artifact ${artifact}: not an artifact of this registry (${ids.join(", ")})`);
      artifactId = artifact;
    } else if (ids.length === 1) artifactId = ids[0];
    else throw new Error(`this registry has ${ids.length} artifacts (${ids.join(", ")}); pass --artifact <id>`);
    mode = "registry";
    decisions = registry.project.decisions ?? [];
    density = registry.project.brand?.density ?? null;
    manifestPath = `.styleseed/manifests/${artifactId}.json`;
    ledgerPath = ".styleseed/project.json";
    resolveCommand = `resolve-context.mjs --project-root . --artifact ${artifactId} --agent <agent>`;
  } else {
    if (artifact) throw new Error(`--artifact ${artifact}: this project has no registry (.styleseed/project.json); drop --artifact`);
    mode = "legacy";
    const ledger = safeProjectPath(root, LEDGER_FILE);
    if (!existsSync(ledger)) decisions = [];
    else {
      let raw;
      try { raw = parseStrictJson(readFileSync(ledger, "utf8")); } catch (error) { throw new Error(`${LEDGER_FILE}: ${error.message}; it must be a JSON array of decision entries`); }
      decisions = normalizeDecisions(raw, catalog, LEDGER_FILE);
      const scoped = decisions.find((entry) => entry.scope?.artifacts);
      if (scoped) throw new Error(`${LEDGER_FILE} ${scoped.id}: \`scope.artifacts\` needs a registry; a project without one has a single artifact. Use \`scope.screens\` or drop the scope.`);
    }
    density = lockDensity(root);
    manifestPath = ".styleseed/manifest.json";
    ledgerPath = LEDGER_FILE;
    resolveCommand = "resolve-context.mjs --project-root . --from-lock STYLESEED.md --agent <agent>";
  }
  const manifest = readProjectJson(root, manifestPath);
  if (manifest === null) throw new Error(`${manifestPath} is missing: resolve first with \`node <installed-ss-resolve>/scripts/${resolveCommand}\`, then run this again`);
  const selection = manifest.selection;
  if (!selection || typeof selection.adapter !== "string" || typeof selection.page !== "string") throw new Error(`${manifestPath} has no selection (adapter, page); resolve again with \`node <installed-ss-resolve>/scripts/${resolveCommand}\``);
  const highest = decisions.reduce((max, entry) => Math.max(max, Number(entry.id.slice(2))), 0);
  return {
    root, mode, artifact: artifactId, selection, manifestPath,
    project: { mode, decisions, density, recipe: typeof selection.recipe === "string" ? selection.recipe : null, ledger: { path: ledgerPath, entries: decisions.length, nextId: `D-${String(highest + 1).padStart(3, "0")}` } },
  };
}

// One measured reference of the project, and a note when its contract does not count as kept.
export function loadReference(root, slug, catalog) {
  const dir = `.styleseed/evidence/_reference/${slug}/measurements`;
  const summaryPath = `${dir}/summary.json`;
  const factsPath = `${dir}/facts.json`;
  const summary = readProjectJson(root, summaryPath);
  const facts = readProjectJson(root, factsPath);
  if (summary === null && facts === null) throw new Error(`--reference ${slug}: neither ${summaryPath} nor ${factsPath} can be read. Measure it first: measure-reference.mjs <url> --project-root . --slug ${slug}`);
  const evidencePath = `.styleseed/rulesets/${slug}/evidence.json`;
  const target = safeProjectPath(root, evidencePath);
  let evidence = null;
  let note = null;
  if (existsSync(target)) {
    const text = readFileSync(target, "utf8");
    if (!isGeneratedEvidence(text)) note = `--reference ${slug}: ${evidencePath} is a hand-written contract, so its values count as measured, not kept.`;
    else {
      const parsed = normalizeReferenceEvidence(JSON.parse(text), { file: evidencePath, catalog, verifyApproval: false });
      if (isApproved(parsed)) evidence = parsed;
      else note = `--reference ${slug}: ${evidencePath} is ${parsed.approval.status === "draft" ? "a draft" : "changed after approval"}, so its values count as measured, not kept in a contract.`;
    }
  }
  return { values: referenceValues({ slug, summary, facts, evidence }), note };
}

function parseEntry(text) {
  const match = /^([A-Za-z]+)=(.+)$/u.exec(text);
  if (!match) throw new Error(`--entry ${text}: write it as <axis>=<v1,v2,…>, for example --entry controlHeights=32,40`);
  const values = match[2].split(",").map((part) => part.trim());
  if (values.some((part) => !/^\d+(?:\.\d+)?$/u.test(part))) throw new Error(`--entry ${text}: values are numbers separated by commas, for example --entry ${match[1]}=32,40`);
  return { axis: match[1], values: values.map(Number) };
}

function axisLine(axis) {
  const unit = PROPOSAL_AXES.find((entry) => entry.axis === axis.axis).unit;
  const v = (values) => `${values.join(", ")}${unit}`;
  const first = axis.options[0];
  if (axis.status === "recorded") return `${axis.axis}: recorded ${v(axis.recorded.values)} as ${axis.recorded.id}`;
  if (axis.status === "proposed") return `${axis.axis}: proposed ${v(first.values)} (${first.basis === "corpus" ? "corpus" : `reference ${first.slug}, ${first.kept ? "kept" : "measured"}`}${axis.partial ? "; one part of the set" : ""})`;
  if (axis.status === "split") return `${axis.axis}: no value proposed (the measured systems split)`;
  if (axis.status === "thin") return `${axis.axis}: no value proposed (fewer than 3 measured systems)`;
  return `${axis.axis}: no measured basis`;
}

export function main(argv, { stdout = (text) => process.stdout.write(text), stderr = (text) => process.stderr.write(text) } = {}) {
  const args = parseArgs(argv);
  if (args.help) { stdout(`${USAGE}\n`); return 0; }
  const { pack, defaults, catalog } = loadSkillData();
  if (args.engineDefaults) {
    stdout(renderEngineDefaultsMarkdown(engineDefaultsTable(pack, defaults, { page: checkPage(args.page ?? "form", catalog) })));
    return 0;
  }
  const loaded = loadProject(args.projectRoot, catalog, { artifact: args.artifact });
  if (loaded.selection.adapter !== "product-ui") throw new Error(`proposals cover product UI measured in CSS pixels; this artifact uses \`${loaded.selection.adapter}\``);
  const page = args.page !== null ? checkPage(args.page, catalog) : loaded.selection.page;
  const references = args.references.map((slug) => loadReference(loaded.root, slug, catalog));
  const notes = references.map((ref) => ref.note).filter(Boolean);
  const proposal = proposeSystem({ pack, defaults, project: loaded.project, context: { artifact: loaded.artifact, page, surface: args.surface }, references: references.map((ref) => ref.values) });
  const command = `propose-system.mjs --project-root .${loaded.artifact ? ` --artifact ${loaded.artifact}` : ""}${args.page !== null ? ` --page ${page}` : ""}${args.references.map((slug) => ` --reference ${slug}`).join("")} --surface ${args.surface}`;
  if (args.entry !== null) {
    const { axis, values } = parseEntry(args.entry);
    stdout(`${JSON.stringify(entryForValues(proposal, axis, values), null, 2)}\n`);
    for (const note of notes) stderr(`${note}\n`);
    stderr(`Append it to ${loaded.project.ledger.path}${loaded.mode === "registry" ? " (decisions)" : ""} as ${loaded.project.ledger.nextId}, with approvedBy set to the name the person gives and date to today. Nothing was written.\n`);
    return 0;
  }
  if (args.json) {
    for (const note of notes) stderr(`${note}\n`);
    stdout(`${JSON.stringify(proposal, null, 2)}\n`);
    return 0;
  }
  const markdown = renderProposalMarkdown(proposal, { command });
  if (!args.write) {
    stdout(`${notes.map((note) => `${note}\n`).join("")}${notes.length ? "\n" : ""}${markdown}`);
    return 0;
  }
  mkdirSync(safeProjectPath(loaded.root, PROPOSALS_DIR), { recursive: true });
  writeFileSync(safeProjectPath(loaded.root, `${PROPOSALS_DIR}/system.json`), `${JSON.stringify(proposal, null, 2)}\n`);
  writeFileSync(safeProjectPath(loaded.root, `${PROPOSALS_DIR}/SYSTEM.md`), markdown);
  stdout([...notes, ...proposal.axes.map(axisLine), `wrote ${PROPOSALS_DIR}/SYSTEM.md`, `wrote ${PROPOSALS_DIR}/system.json`].map((line) => `${line}\n`).join(""));
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exit(main(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exit(1); }
}
