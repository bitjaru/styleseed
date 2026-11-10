#!/usr/bin/env node
// Operator runner for the pre-registered S1 fifth-screen drift measurement
// (research/design-judgment/drift/PROTOCOL.md). One mode per invocation:
//
//   --plan (default)  print every step and command for every arm and run; writes nothing
//   --prepare --out <new-dir> [--round baseline] [--arms a,b] [--runs 3] [--model <id>] [--effort high]
//             [--timeout-minutes 40] [--skill-dir <arm>=<dir>] [--codex-auth <file>] [--allow-dirty]
//             [--no-isolated-home --allow-global-skills]
//   --preflight --out <dir>   one trivial `codex exec` in the isolated home; checks model and effort
//   --run --out <dir> --arm <id> --run-index <n> [--node-modules <dir>] [--browser <playwright module>]
//         [--no-isolated-home --allow-global-skills]
//   --remeasure --out <dir> --arm <id> --run-index <n> [--browser <module>]   rerun only the floor and
//         measurement of a run whose five sessions finished and whose floor failed for an infrastructure reason
//   --replace --out <dir> --arm <id> --run-index <n>   top-up rule: replace an infrastructure-invalid run
//   --report --out <dir>
//
// Isolation (default): every codex child runs with HOME and CODEX_HOME inside <out>/home, a fresh
// copy per session holding an empty .agents/, a generated config.toml and a symlink to the
// operator's Codex auth file (never read, copied, moved or deleted), plus the session environment
// frozen at --prepare (Playwright browser cache, a neutral git identity). The real home's skills,
// memories, hooks, plugins and AGENTS.md are listed as not carried over. Agent-written code that the
// runner executes (model tests, build, next start) gets a fresh empty HOME under <out>/home/floor.
// Safety: refuses an output folder that exists or is inside this checkout; writes only inside
// --out (npm and installer caches included) and its own temp folders; never installs global
// packages and never touches git remotes. Network: third-party skill installs at --prepare,
// npm ci (unless --node-modules) and Codex itself at --run and --preflight.
import { spawn, spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import {
  closeSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync, readlinkSync,
  realpathSync, renameSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { homedir } from 'node:os';
import { basename, delimiter, dirname, isAbsolute, join, posix as posixPath, relative, resolve, sep, win32 as win32Path } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPilotPlan } from './prepare-design-pilot.mjs';
import { VIEWPORTS, classifyFailures, driftMetric, loadRun, renderArmTable, separates, summarizeArm } from './s1-drift-metric.mjs';
import { loadBrowser, observeUrls } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/measure-reference.mjs';
import { summarize } from '../engine/.claude/skills/styleseed/workflows/ss-reference/scripts/analyze-observations.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const DRIFT_DIR = 'research/design-judgment/drift';
export const FROZEN_FILES = Object.freeze([`${DRIFT_DIR}/PROTOCOL.md`, `${DRIFT_DIR}/screens.json`, `${DRIFT_DIR}/arms.json`, 'scripts/s1-drift-metric.mjs']);
const RUNNER_FILE = 'scripts/run-s1-drift.mjs';
export const EFFORTS = Object.freeze(['minimal', 'low', 'medium', 'high', 'xhigh']);
export const DEFAULTS = Object.freeze({ round: 'baseline', runs: 3, effort: 'high', timeoutMinutes: 40 });
export const MAX_REPLACEMENTS = 2; // per arm per round, infrastructure failures only
export const MAX_REMEASURES = 3; // per run, infrastructure failures of the floor only
export const AUTH_MARKER = 'AUTH-REPLACED.txt';
export const AGENT_GIT_IDENTITY = Object.freeze({
  GIT_AUTHOR_EMAIL: 's1-drift-agent@localhost', GIT_AUTHOR_NAME: 's1-drift-agent',
  GIT_COMMITTER_EMAIL: 's1-drift-agent@localhost', GIT_COMMITTER_NAME: 's1-drift-agent',
});
export const SESSION_ENV_KEYS = Object.freeze(['PLAYWRIGHT_BROWSERS_PATH', ...Object.keys(AGENT_GIT_IDENTITY)]);
const FIXTURE_FILES = ['fixture/model.mjs', 'fixture/model.test.mjs', 'fixture/fixtures.json'];
const REMOVED_KIT_FILES = ['TASK.md', 'PROMPT.md'];
export const NEUTRAL_AGENTS = '# Working agreement\n\nUse this workspace only. Do not inspect sibling conditions, operator materials, or previous results. Report unsupported requirements and verification limits.\n\nEach request names one screen of this app. `BROWSER-CONTRACT.md` describes the shared test controls.\n';
export const PREFLIGHT_PROMPT = 'Reply with exactly one word: ready. Do not run commands or edit files.\n';
export const ISOLATED_CONFIG_KEYS = Object.freeze(['model', 'model_reasoning_effort', 'sandbox_mode', 'sandbox_workspace_write.network_access']);
const GITIGNORE = 'node_modules/\n.next/\nnext-env.d.ts\n*.tsbuildinfo\n';
const GIT_IDENTITY = ['-c', 'user.name=s1-drift-runner', '-c', 'user.email=s1-drift-runner@localhost', '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', '-c', 'core.fsmonitor=false'];
const posix = process.platform !== 'win32';
const npmCommand = posix ? 'npm' : 'npm.cmd';
const activeChildren = new Set();

const sha256 = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const json = value => `${JSON.stringify(value, null, 2)}\n`;
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const within = (parent, child) => {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
};
const fileHash = path => (existsSync(path) ? sha256(readFileSync(path)) : null);
const camel = flag => flag.replace(/^--/u, '').replace(/-([a-z])/gu, (_, c) => c.toUpperCase());
const flagName = key => `--${key.replace(/[A-Z]/gu, c => `-${c.toLowerCase()}`)}`;
const settleSignals = () => new Promise(done => setTimeout(done, 100));
const shortId = () => randomBytes(3).toString('hex');

// ---------------------------------------------------------------- arguments

const MODES = ['--plan', '--prepare', '--preflight', '--run', '--remeasure', '--replace', '--report'];
const VALUE_OPTIONS = ['--out', '--arms', '--runs', '--round', '--model', '--effort', '--arm', '--run-index', '--node-modules', '--browser', '--timeout-minutes', '--skill-dir', '--codex-auth'];
const FLAG_OPTIONS = ['--allow-global-skills', '--allow-dirty', '--no-isolated-home', '--help'];
const ALLOWED = {
  plan: ['round', 'arms', 'runs', 'model', 'effort', 'timeoutMinutes'],
  prepare: ['out', 'round', 'arms', 'runs', 'model', 'effort', 'timeoutMinutes', 'skillDirs', 'codexAuth', 'allowDirty', 'allowGlobalSkills', 'noIsolatedHome'],
  preflight: ['out'],
  run: ['out', 'arm', 'runIndex', 'nodeModules', 'browser', 'allowGlobalSkills', 'noIsolatedHome'],
  remeasure: ['out', 'arm', 'runIndex', 'browser'],
  replace: ['out', 'arm', 'runIndex'],
  report: ['out'],
};

export function parseArgs(argv) {
  const options = {};
  let mode = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (MODES.includes(arg)) {
      if (mode) throw new Error(`Pass one mode per invocation; got --${mode} and ${arg}.`);
      mode = arg.slice(2);
    } else if (FLAG_OPTIONS.includes(arg)) {
      options[camel(arg)] = true;
    } else if (VALUE_OPTIONS.includes(arg)) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value.`);
      if (arg === '--skill-dir') {
        const at = value.indexOf('=');
        if (at < 1 || at === value.length - 1) throw new Error('--skill-dir takes <arm>=<folder holding the pinned skill tree>.');
        (options.skillDirs ||= {})[value.slice(0, at)] = value.slice(at + 1);
      } else {
        options[camel(arg)] = value;
      }
    } else {
      throw new Error(`Unknown argument ${arg}. Use --help.`);
    }
  }
  options.mode = mode || 'plan';
  if (options.help) return options;
  for (const key of Object.keys(options)) {
    if (key === 'mode' || key === 'help') continue;
    if (!ALLOWED[options.mode].includes(key)) throw new Error(`${flagName(key)} does not apply to --${options.mode}. Use --help.`);
  }
  if (options.noIsolatedHome && !options.allowGlobalSkills) {
    throw new Error('--no-isolated-home lets the real Codex home and user skills reach the sessions; it is allowed only together with --allow-global-skills, and the run is recorded as isolation: none.');
  }
  options.round ??= DEFAULTS.round;
  if (!['baseline', 're-measure'].includes(options.round)) throw new Error(`--round must be baseline or re-measure; got ${options.round}.`);
  options.effort ??= DEFAULTS.effort;
  if (!EFFORTS.includes(options.effort)) throw new Error(`--effort must be one of ${EFFORTS.join(', ')}; got ${options.effort}.`);
  const integer = (name, value, min, max) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`--${name} must be a whole number from ${min} to ${max}; got ${value}.`);
    return n;
  };
  options.runs = options.runs === undefined ? DEFAULTS.runs : integer('runs', options.runs, 1, 20);
  options.timeoutMinutes = options.timeoutMinutes === undefined ? DEFAULTS.timeoutMinutes : integer('timeout-minutes', options.timeoutMinutes, 1, 600);
  if (options.mode !== 'plan' && !options.out) throw new Error(`--${options.mode} needs --out <dir>.`);
  if (['run', 'remeasure', 'replace'].includes(options.mode)) {
    if (!options.arm) throw new Error(`--${options.mode} needs --arm <id>.`);
    if (options.runIndex === undefined) throw new Error(`--${options.mode} needs --run-index <n>.`);
    options.runIndex = integer('run-index', options.runIndex, 1, 20);
  }
  return options;
}

// ---------------------------------------------------------------- protocol inputs

export function loadProtocol(root = repo) {
  const screensDoc = readJson(join(root, DRIFT_DIR, 'screens.json'));
  const armsDoc = readJson(join(root, DRIFT_DIR, 'arms.json'));
  const screens = [...screensDoc.screens].sort((a, b) => a.order - b.order);
  screens.forEach((screen, i) => {
    if (screen.order !== i + 1) throw new Error(`${DRIFT_DIR}/screens.json: screen orders must run 1..${screens.length}; ${screen.id} has order ${screen.order}.`);
  });
  for (const field of ['id', 'route']) {
    if (new Set(screens.map(s => s[field])).size !== screens.length) throw new Error(`${DRIFT_DIR}/screens.json: every screen needs a unique ${field}.`);
  }
  if (new Set(armsDoc.arms.map(a => a.id)).size !== armsDoc.arms.length) throw new Error(`${DRIFT_DIR}/arms.json: arm ids must be unique.`);
  return { screens, arms: armsDoc.arms, prompt: screensDoc.prompt };
}

export function roundArms(protocol, round) {
  if (round === 'baseline') return protocol.arms.filter(arm => arm.round === 'baseline');
  if (round === 're-measure') return [...protocol.arms];
  throw new Error(`Unknown round ${round}; use baseline or re-measure.`);
}

export function selectArms(protocol, round, ids) {
  const pool = roundArms(protocol, round);
  if (!ids) return pool;
  const wanted = String(ids).split(',').map(id => id.trim()).filter(Boolean);
  for (const id of wanted) {
    if (!pool.some(arm => arm.id === id)) throw new Error(`--arms: ${id} is not an arm of the ${round} round in ${DRIFT_DIR}/arms.json (use ${pool.map(arm => arm.id).join(', ')}).`);
  }
  return pool.filter(arm => wanted.includes(arm.id));
}

// Session prompts are identical across arms except the method line.
export function renderPrompt(protocol, arm, screen) {
  const lines = [
    `# Session ${screen.order} of ${protocol.screens.length}: ${screen.title}`, '',
    screen.order === 1 ? protocol.prompt.firstSession : protocol.prompt.laterSessions, '',
    arm.methodLine, '',
    '## The screen', '',
    `Route: \`${screen.route}\`${screen.routePattern ? ` (implement it as \`${screen.routePattern}\`; this URL is the one measured)` : ''}. Serve it at exactly this path.`, '',
    screen.task, '',
    `States to support: ${screen.states.join(', ')}.`,
  ];
  if (screen.pressure) lines.push('', screen.pressure);
  lines.push('', '## Constraints', '', ...protocol.prompt.constraints.map(line => `- ${line}`), '');
  return lines.join('\n');
}

// Flags as in the bake-off harness (assets/bakeoff-harness/run.sh): fresh `codex exec`, workspace
// sandbox with network, effort and model from freeze.json, prompt on stdin, last message saved.
export function codexArgs({ workspace, model, effort, lastMessage }) {
  return ['exec', '-C', workspace, '--sandbox', 'workspace-write', '-c', 'sandbox_workspace_write.network_access=true',
    '-c', `model_reasoning_effort="${effort}"`, '--model', model, '--color', 'never', '-o', lastMessage, '-'];
}

export function parseCodexHeader(text) {
  const head = String(text).split('\n').slice(0, 60).join('\n');
  return { model: head.match(/^model:\s*(\S+)/mu)?.[1] ?? null, effort: head.match(/^reasoning effort:\s*(\S+)/mu)?.[1] ?? null };
}

const shellWord = word => (/^[A-Za-z0-9_./:=<>@,+-]+$/u.test(word) ? word : `'${word.replace(/'/gu, `'\\''`)}'`);

function pinSummary(arm) {
  if (!arm.skill) return 'no skill';
  const pin = arm.skill.pin;
  if (!pin) return `${arm.skill.installDir} from ${arm.skill.source}: NOT PINNED (--prepare refuses until arms.json and PROTOCOL.md record the pin)`;
  if (pin.engineRevision) return `${arm.skill.installDir} from ${arm.skill.source} at engine ${pin.engineVersion} ${pin.engineRevision}`;
  return `${arm.skill.installDir} from ${arm.skill.source} at tree ${pin.treeHash} (${pin.files} files, installer ${arm.skill.installer})`;
}

// --plan: deterministic text, placeholders instead of machine paths, nothing written.
export function buildPlan({ round = DEFAULTS.round, arms: armIds, runs = DEFAULTS.runs, effort = DEFAULTS.effort, model = null, timeoutMinutes = DEFAULTS.timeoutMinutes } = {}, root = repo) {
  const protocol = loadProtocol(root);
  const arms = selectArms(protocol, round, armIds);
  const modelText = model || '<model>';
  const sessions = protocol.screens.length;
  const identity = Object.entries(AGENT_GIT_IDENTITY).map(([key, value]) => `${key}=${value}`).join(' ');
  const out = [];
  out.push(`S1 fifth-screen drift: operator plan (round: ${round})`);
  out.push(`Protocol: ${DRIFT_DIR}/PROTOCOL.md (pre-registered; read it before running anything).`);
  out.push(`Arms: ${arms.map(arm => arm.id).join(', ')}. Runs per arm: ${runs}. Sessions per run: ${sessions}. Codex sessions in total: ${arms.length * runs * sessions}.`);
  out.push(`Model: ${model || '<model>, frozen in freeze.json by --prepare (from --model or the Codex config)'}. Reasoning effort: ${effort}. One attempt per session, no retries, ${timeoutMinutes} minutes per session; a session that fails or times out fails the run.`);
  out.push('Run every command from the repository root, in a dedicated checkout at the pinned engine revision. <out> is a new folder outside this checkout.');
  out.push('');
  out.push('0. Preconditions');
  out.push('   - The checkout is clean (git status --porcelain prints nothing); --prepare refuses a dirty checkout unless --allow-dirty, which is recorded.');
  out.push('   - You are logged in to Codex. The isolated home links your Codex auth file (default $CODEX_HOME/auth.json or ~/.codex/auth.json, or --codex-auth <file>); the runner never reads, copies, moves or deletes it.');
  out.push('   - Every codex child runs in a fresh copy of <out>/home: an empty .agents/, the generated config.toml (model, effort, sandbox only) and the auth link. Your real skills, memories, hooks, plugins and AGENTS.md are listed in freeze.json as not carried over. Network access stays on.');
  out.push('   - The auth link exists only while a session\'s (or the preflight\'s) Codex process runs: the template <out>/home holds none, the runner removes each link when its process exits, and every command except --prepare starts by removing leftover links under <out>/home, because archive tools may follow links. <out>/home holds Codex\'s own session files (history, logs): it is working state and is never published. One runner command per <out> at a time (a lock enforces it).');
  out.push('   - <sessionEnv>, frozen at --prepare in freeze.json isolation.sessionEnv and applied to every session and the preflight, together with HOME=<session home> and CODEX_HOME=<session home>/.codex:');
  out.push('       PLAYWRIGHT_BROWSERS_PATH = your value when set; else the platform default cache if it exists (macOS ~/Library/Caches/ms-playwright, Linux ~/.cache/ms-playwright, Windows %LOCALAPPDATA%\\ms-playwright); else absent, and freeze.json and the report say no browser cache was available');
  out.push(`       ${identity}`);
  out.push('       The npm cache stays in the isolated home. With --no-isolated-home, sessionEnv is not applied and the real environment is used as is.');
  out.push('   - If Codex replaces the auth link during a session or the preflight, the run stops as an infrastructure failure and <out>/AUTH-REPLACED.txt says what to do; --run, --replace and --preflight refuse while it exists.');
  out.push('   - Chromium for the demo Playwright is installed (cd demo-pricing && npx playwright install chromium).');
  out.push('   - The model tests, the build and next start run agent-written code outside the Codex sandbox with HOME set to a fresh empty <out>/home/floor/<arm>-run-<n>-<id>; the rest of the file system and the network are not shielded: use a disposable machine account.');
  out.push('');
  out.push('1. Prepare (network only for third-party skill installs; no model)');
  out.push(`   node scripts/run-s1-drift.mjs --prepare --out <out> --round ${round} --arms ${arms.map(arm => arm.id).join(',')} --runs ${runs} --model ${modelText} --effort ${effort} --timeout-minutes ${timeoutMinutes}`);
  for (const arm of arms) out.push(`   - ${arm.id}: kit arm ${arm.kit}; ${pinSummary(arm)}`);
  out.push(`   Each <out>/<arm>/run-<n>/workspace is a git repository (one starter commit) holding the kit files minus ${REMOVED_KIT_FILES.join(' and ')}, the neutral AGENTS.md and .gitignore, and the arm's skill; prompts/session-1..${sessions}.md sit next to it, outside the workspace. <out>/<arm>/starter keeps a pristine copy for replacements. <out>/home is the isolated-home template. <out>/freeze.json is written last.`);
  out.push('');
  out.push('1b. Preflight (one trivial Codex session; network and model)');
  out.push('   node scripts/run-s1-drift.mjs --preflight --out <out>');
  out.push(`   HOME=<out>/home/preflight/<id> CODEX_HOME=<out>/home/preflight/<id>/.codex <sessionEnv> codex exec --skip-git-repo-check ${codexArgs({ workspace: '<out>/home/preflight/<id>/work', model: modelText, effort, lastMessage: '<out>/home/preflight/<id>/last-message.md' }).slice(1).map(shellWord).join(' ')} < <out>/home/preflight/<id>/prompt.md`);
  out.push('   passes when the log header shows the frozen model and effort, the reply is one word and the auth link survived; fix the environment before any --run otherwise.');
  out.push('');
  out.push('2. Run (one invocation per arm and run, interleaved by run index)');
  let step = 0;
  for (let n = 1; n <= runs; n++) {
    for (const arm of arms) {
      const base = `<out>/${arm.id}/run-${n}`;
      out.push(`   2.${++step} ${arm.id} run ${n}`);
      out.push(`     node scripts/run-s1-drift.mjs --run --out <out> --arm ${arm.id} --run-index ${n} [--node-modules demo-pricing/node_modules]`);
      out.push(`     install (in ${base}/workspace, npm cache <out>/.npm-cache): npm ci --no-audit --no-fund; with --node-modules <dir>: version check against package-lock.json, then cp -cR <dir> node_modules (a plain copy if cloning fails). A failed install starts nothing and can be repeated.`);
      for (const screen of protocol.screens) {
        const home = `<out>/home/sessions/${arm.id}-run-${n}-s${screen.order}-<id>`;
        const args = codexArgs({ workspace: `${base}/workspace`, model: modelText, effort, lastMessage: `${base}/sessions/${screen.order}/last-message.md` });
        out.push(`     session ${screen.order} ${screen.id} ${screen.route}: HOME=${home} CODEX_HOME=${home}/.codex <sessionEnv> codex ${args.map(shellWord).join(' ')} < ${base}/prompts/session-${screen.order}.md > ${base}/sessions/${screen.order}/codex.log 2>&1; then the runner checks the auth link and commits the workspace`);
      }
      out.push(`     floor (in the workspace, HOME=<out>/home/floor/${arm.id}-run-${n}-<id>): fixture/model.mjs, fixture/model.test.mjs and fixture/fixtures.json unchanged; node --test fixture/model.test.mjs; npm run build; node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port <free port>; ${protocol.screens.map(s => s.route).join(', ')} at 1440x900 and 390x844 return 200 with no uncaught page error; no horizontal overflow at 390`);
      out.push(`     measure: observeUrls at both viewports -> ${base}/measurements/{1440,390}/<screen>.json and ${base}/drift.json; screenshots -> ${base}/screens/{1440,390}/<screen>.png; stop the server; ${base}/run.json (invalid runs are classified agent or infrastructure, each failure with its phase: sessions or floor)`);
    }
  }
  out.push(`   Remeasure: when all ${sessions} sessions finished and only the floor failed for an infrastructure reason, the outcome is measured again, not regenerated (at most ${MAX_REMEASURES} per run; no replacement used):`);
  out.push('     node scripts/run-s1-drift.mjs --remeasure --out <out> --arm <id> --run-index <n>');
  out.push(`   Top-up: every other infrastructure-invalid run is replaced, in run-index order, until the arm's ${MAX_REPLACEMENTS} replacements are used:`);
  out.push('     node scripts/run-s1-drift.mjs --replace --out <out> --arm <id> --run-index <n>, then the same --run command again');
  out.push('   Agent outcomes (a session failed or timed out, or the functional floor broke) are reported as invalid and never replaced.');
  out.push('');
  out.push('3. Report');
  out.push('   node scripts/run-s1-drift.mjs --report --out <out>');
  out.push('   writes <out>/REPORT.md, <out>/report.json, <out>/blind/ (five-screen sets under random labels) and <out>/blind-key.json (stays with the operator); an arm with an unresolved infrastructure failure is marked pending, with the command that resolves it');
  out.push('   node scripts/s1-drift-metric.mjs <out>/<arm>/run-<n> ... recomputes the metric from the raw measurements (read-only)');
  out.push('');
  out.push(`Decision rule, top-up rule, kill rule and publication: ${DRIFT_DIR}/PROTOCOL.md sections 8 and 9.`);
  return `${out.join('\n')}\n`;
}

// ---------------------------------------------------------------- isolation

export function codexHome(env = process.env) {
  return env.CODEX_HOME ? resolve(env.CODEX_HOME) : join(homedir(), '.codex');
}

// The operator's user-level skill folders. S1_DRIFT_GLOBAL_SKILL_DIRS (path-delimiter separated)
// replaces the default list; tests use it.
export function globalSkillDirs(env = process.env) {
  if (env.S1_DRIFT_GLOBAL_SKILL_DIRS !== undefined) return env.S1_DRIFT_GLOBAL_SKILL_DIRS.split(delimiter).filter(Boolean).map(dir => resolve(dir));
  const dirs = [];
  if (env.CODEX_HOME) dirs.push(join(resolve(env.CODEX_HOME), 'skills'));
  dirs.push(join(homedir(), '.codex', 'skills'), join(homedir(), '.agents', 'skills'));
  return [...new Set(dirs)];
}

export const isDesignSkillName = name => /styleseed|hallmark|taste|impeccable|frontend-design/iu.test(name) || /^ss-/iu.test(name);

export function findGlobalSkills(dirs) {
  const listed = dirs.map(dir => {
    try {
      const entries = readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory() || entry.isSymbolicLink()).map(entry => entry.name).sort();
      return { dir, exists: true, entries };
    } catch {
      return { dir, exists: false, entries: [] };
    }
  });
  return { dirs: listed, matched: listed.flatMap(({ dir, entries }) => entries.filter(isDesignSkillName).map(name => ({ dir, name }))) };
}

// Second line of defence for --no-isolated-home runs: design skills in the real folders.
export function guardGlobalSkills({ allow = false, env = process.env } = {}) {
  const found = findGlobalSkills(globalSkillDirs(env));
  if (found.matched.length && !allow) {
    throw new Error(`Design skills are visible to Codex outside the workspace:\n${found.matched.map(item => `  ${join(item.dir, item.name)}`).join('\n')}\nMove them out of these folders for the round, or pass --allow-global-skills (recorded in freeze.json and run.json).`);
  }
  return { ...found, allowed: Boolean(allow) };
}

function readConfigModel(home) {
  let text;
  try { text = readFileSync(join(home, 'config.toml'), 'utf8'); } catch { return null; }
  for (const line of text.split('\n')) {
    if (/^\s*\[/u.test(line)) break;
    const match = line.match(/^\s*model\s*=\s*"([^"]+)"/u);
    if (match) return match[1];
  }
  return null;
}

// Facts about the real Codex home, without reading the auth file.
export function codexHomeState(env = process.env) {
  const home = codexHome(env);
  let plugins = [];
  try { plugins = readdirSync(join(home, 'plugins')).sort(); } catch {}
  return {
    home, configModel: readConfigModel(home),
    agentsMd: fileHash(join(home, 'AGENTS.md')), agentsOverrideMd: fileHash(join(home, 'AGENTS.override.md')),
    memories: existsSync(join(home, 'memories')), hooks: existsSync(join(home, 'hooks.json')), plugins,
  };
}

// Top-level entries of the real Codex home and the user skill folders that the isolated home does
// not carry over. auth.json is linked, not carried over, and is left out of the list.
export function notCarriedOver(env = process.env) {
  const home = codexHome(env);
  let entries = [];
  try { entries = readdirSync(home).filter(name => name !== 'auth.json').sort(); } catch {}
  return {
    codexHome: { path: home, entries },
    skills: findGlobalSkills(globalSkillDirs(env)).dirs.filter(item => item.exists).map(({ dir, entries: names }) => ({ dir, entries: names })),
  };
}

// Playwright's default browser cache for a platform, resolved against the real home.
export function playwrightCacheDefault(platform, env) {
  if (platform === 'win32') {
    const home = env.USERPROFILE || homedir();
    return win32Path.join(env.LOCALAPPDATA || win32Path.join(home, 'AppData', 'Local'), 'ms-playwright');
  }
  const home = env.HOME || homedir();
  return platform === 'darwin' ? posixPath.join(home, 'Library', 'Caches', 'ms-playwright') : posixPath.join(home, '.cache', 'ms-playwright');
}

// The session environment, resolved once at --prepare and applied unchanged to every session of
// every arm and to the preflight: the browser cache (so skills that render a page can find a
// browser) and a neutral git identity (so an agent that commits does not fail on a missing one).
export function resolveSessionEnv({ platform = process.platform, env = process.env, exists = existsSync } = {}) {
  let browserCache;
  if (env.PLAYWRIGHT_BROWSERS_PATH) browserCache = { source: 'operator', path: env.PLAYWRIGHT_BROWSERS_PATH };
  else {
    const path = playwrightCacheDefault(platform, env);
    browserCache = exists(path) ? { source: 'platform-default', path }
      : { source: 'none', path: null, checked: path, note: 'No Playwright browser cache was available to the sessions.' };
  }
  const vars = { ...AGENT_GIT_IDENTITY };
  if (browserCache.path) vars.PLAYWRIGHT_BROWSERS_PATH = browserCache.path;
  return { sessionEnv: Object.fromEntries(Object.entries(vars).sort(([a], [b]) => (a < b ? -1 : 1))), browserCache };
}

export function isolatedConfig({ model, effort }) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/u.test(String(model))) throw new Error(`Model id ${JSON.stringify(model)} is not a plain identifier; pass --model with letters, digits, dots, dashes, colons, slashes or underscores.`);
  if (!EFFORTS.includes(effort)) throw new Error(`Effort ${effort} is not one of ${EFFORTS.join(', ')}.`);
  return [
    '# Generated by scripts/run-s1-drift.mjs for an isolated S1 drift round. Only these keys are set.',
    `model = "${model}"`,
    `model_reasoning_effort = "${effort}"`,
    'sandbox_mode = "workspace-write"',
    '',
    '[sandbox_workspace_write]',
    'network_access = true',
    '',
  ].join('\n');
}

export function authPathFor(options, env = process.env) {
  const path = options.codexAuth ? resolve(options.codexAuth) : join(codexHome(env), 'auth.json');
  try { lstatSync(path); } catch {
    throw new Error(`No Codex auth file at ${path}. Log in with codex first, or pass --codex-auth <file>. The runner links this file into the isolated home and never reads, copies, moves or deletes it.`);
  }
  return path;
}

// One isolated home: <dir>/.agents (empty) and <dir>/.codex with config.toml, plus an auth link
// for a session or preflight home (link: true). The template under <out>/home never gets a link.
export function createIsolatedHome(dir, { authPath, configText, link = true }) {
  mkdirSync(dirname(dir), { recursive: true, mode: 0o700 });
  mkdirSync(dir, { mode: 0o700 });
  mkdirSync(join(dir, '.agents'), { mode: 0o700 });
  mkdirSync(join(dir, '.codex'), { mode: 0o700 });
  writeFileSync(join(dir, '.codex', 'config.toml'), configText, { flag: 'wx', mode: 0o600 });
  if (!link) return dir;
  try { symlinkSync(authPath, join(dir, '.codex', 'auth.json')); } catch (error) {
    throw new Error(`Cannot link the Codex auth file into ${join(dir, '.codex')}: ${error.message}. On Windows enable Developer Mode for symlinks, or run with --no-isolated-home --allow-global-skills.`);
  }
  return dir;
}

// A codex child gets HOME, CODEX_HOME and the frozen sessionEnv; every other variable passes
// through. A sessionEnv key missing from the frozen set is removed, so all sessions see the same.
export function sessionEnvironment(env, home, sessionEnv = {}) {
  const base = { ...env };
  for (const key of SESSION_ENV_KEYS) delete base[key];
  return { ...base, ...sessionEnv, HOME: home, CODEX_HOME: join(home, '.codex') };
}

// Agent-written code the runner executes (model tests, build, next start) never sees the
// operator's real home: HOME (and USERPROFILE on Windows) point at a fresh empty folder.
export function floorEnvironment(env, home, { platform = process.platform, extra = {} } = {}) {
  return { ...env, HOME: home, ...(platform === 'win32' ? { USERPROFILE: home } : {}), ...extra };
}

// The isolated home must hold no skills and nothing but the generated config, plus the auth link in
// a session home that is about to run. The template (template: true) must hold no auth link at all.
export function checkIsolatedHome(dir, isolation, { template = false } = {}) {
  const list = path => { try { return readdirSync(path).sort(); } catch { return null; } };
  const agents = list(join(dir, '.agents'));
  const codex = list(join(dir, '.codex'));
  const problems = [];
  if (agents === null) problems.push(`${join(dir, '.agents')} is missing`);
  else if (agents.length) problems.push(`${join(dir, '.agents')} must be empty but holds ${agents.join(', ')}`);
  if (codex === null) problems.push(`${join(dir, '.codex')} is missing`);
  else {
    const allowed = template ? ['config.toml'] : ['auth.json', 'config.toml'];
    const extra = codex.filter(name => !allowed.includes(name));
    if (template && codex.includes('auth.json')) problems.push(`${join(dir, '.codex', 'auth.json')} exists: the template must hold no auth link (an earlier layout); prepare a new round`);
    const others = extra.filter(name => name !== 'auth.json');
    if (others.length || (!template && extra.length)) problems.push(`${join(dir, '.codex')} holds ${extra.join(', ')}; only ${allowed.join(' and ')} ${allowed.length > 1 ? 'are' : 'is'} allowed`);
    if (fileHash(join(dir, '.codex', 'config.toml')) !== isolation.config.sha256) problems.push(`${join(dir, '.codex', 'config.toml')} differs from the generated config in freeze.json`);
    if (!template) {
      let link = null;
      try { link = lstatSync(join(dir, '.codex', 'auth.json')).isSymbolicLink() ? readlinkSync(join(dir, '.codex', 'auth.json')) : null; } catch {}
      if (link !== isolation.auth.path) problems.push(`${join(dir, '.codex', 'auth.json')} must be a symlink to ${isolation.auth.path}`);
    }
    try { lstatSync(isolation.auth.path); } catch { problems.push(`the Codex auth file ${isolation.auth.path} no longer exists; log in to Codex again`); }
  }
  if (problems.length) throw new Error(`The isolated home is not clean:\n  ${problems.join('\n  ')}\nRestore it or prepare a new round.`);
  return { home: dir, agents, codex, skills: [] };
}

// After a Codex process exits, its home must keep no auth link at rest: archive tools that follow
// links (zip, tar -h, cp -L) would copy the credential. This is the only place the runner unlinks
// anything named auth.json, and it unlinks only a path that lstat reported as a symlink in this
// same call; unlinking a symlink removes the link, never its target. A regular file is Codex having
// replaced the link (left untouched); a missing path is recorded.
export function releaseAuthLink(home) {
  const path = join(home, '.codex', 'auth.json');
  let stat;
  try { stat = lstatSync(path); } catch { return { state: 'missing', path }; }
  if (!stat.isSymbolicLink()) return { state: 'file', path };
  unlinkSync(path);
  return { state: 'removed', path };
}

// Leftovers from a crash: every <out>/home/**/.codex/auth.json except the template's (which
// checkIsolatedHome refuses). Links are released; a regular file gets the AUTH-REPLACED marker if
// none exists. Symlinked folders are never followed, and nothing outside <out>/home is scanned.
export function sweepAuthLinks(destination, { realAuthPath = null, log = () => {} } = {}) {
  const home = join(destination, 'home');
  const template = join(home, '.codex');
  const removed = [];
  const files = [];
  const visit = dir => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const path = join(dir, entry.name);
      if (entry.name !== '.codex') { visit(path); continue; }
      if (path === template) continue;
      const result = releaseAuthLink(dir);
      if (result.state === 'removed') removed.push(result.path);
      if (result.state === 'file') files.push(result.path);
    }
  };
  visit(home);
  if (removed.length) log(`removed ${removed.length} leftover auth link(s)`);
  if (files.length && !existsSync(join(destination, AUTH_MARKER))) {
    for (const written of files) writeAuthMarker(destination, { where: 'in a session home left by an earlier run (found at start-up)', written, real: realAuthPath ?? '(freeze.json isolation.auth.path)' });
  }
  return { removed, files };
}

// One runner command per output folder at a time: the start-up sweep would otherwise cut the auth
// link of a session that another command is running. A lock left by a dead process is replaced.
const LOCK_FILE = '.runner.lock';
const pidAlive = pid => { try { process.kill(pid, 0); return true; } catch (error) { return error.code === 'EPERM'; } };
async function withLock(destination, mode, log, body) {
  const path = join(destination, LOCK_FILE);
  const content = json({ pid: process.pid, mode, startedAt: new Date().toISOString() });
  try { writeFileSync(path, content, { flag: 'wx', mode: 0o600 }); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let holder = null;
    try { holder = readJson(path); } catch {}
    if (holder?.pid && pidAlive(holder.pid)) throw new Error(`Another s1-drift runner command (pid ${holder.pid}, --${holder.mode}) is using ${destination}. Run one command at a time per output folder.`);
    log(`Replacing a stale lock left by pid ${holder?.pid ?? 'unknown'}.`);
    writeFileSync(path, content, { mode: 0o600 });
  }
  try { return await body(); } finally {
    try { if (readJson(path).pid === process.pid) rmSync(path); } catch {}
  }
}

// Start of --run, --replace, --remeasure, --preflight and --report: lock, then release leftovers.
const startUp = (destination, freeze, mode, log, body) => withLock(destination, mode, log, () => {
  sweepAuthLinks(destination, { realAuthPath: freeze.isolation?.auth?.path ?? null, log });
  return body();
});

export function authMarkerText({ where, written, real, at }) {
  return [
    `Codex replaced the auth link in the isolated home ${where} (${at}).`,
    '',
    'Codex wrote a regular file at:',
    `  ${written}`,
    'Your real Codex auth file at:',
    `  ${real}`,
    'may now be out of date: Codex may have saved a refreshed login into the file above instead.',
    '',
    'What you can do (the runner never reads, copies, moves or deletes either file):',
    '  1. Keep the refreshed login: move the file Codex wrote over your real auth file.',
    `       mv "${written}" "${real}"`,
    '  2. Or delete the file Codex wrote and log in to Codex again.',
    '',
    'The run was stopped and recorded as an infrastructure failure. --run, --replace and --preflight refuse',
    'to start while this file exists; delete it once the login is resolved.',
    '',
  ].join('\n');
}

function writeAuthMarker(destination, details) {
  const path = join(destination, AUTH_MARKER);
  writeFileSync(path, authMarkerText({ ...details, at: new Date().toISOString() }), { flag: existsSync(path) ? 'a' : 'wx', mode: 0o600 });
  return path;
}

function requireNoAuthMarker(destination) {
  const path = join(destination, AUTH_MARKER);
  if (existsSync(path)) throw new Error(`${path} exists: this command does not start until the Codex login is resolved.\n\n${readFileSync(path, 'utf8')}`);
}

// S1_DRIFT_CODEX_BIN overrides the binary; a .mjs/.js path runs under this Node (tests use a stub).
function codexCommand(env = process.env) {
  const override = env.S1_DRIFT_CODEX_BIN;
  if (override && /\.m?js$/u.test(override)) return { bin: process.execPath, prefix: [resolve(override)], label: override };
  return { bin: override || 'codex', prefix: [], label: override || 'codex' };
}

function codexVersion(env = process.env) {
  const { bin, prefix } = codexCommand(env);
  const result = spawnSync(bin, [...prefix, '--version'], { encoding: 'utf8', timeout: 30000 });
  if (result.error || result.status !== 0) {
    throw new Error(`Cannot read the Codex version (${bin} --version): ${result.error?.message || result.stderr?.trim() || `exit ${result.status}`}. Install the Codex CLI or put it on PATH.`);
  }
  return result.stdout.trim();
}

function git(args, cwd = repo) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 120000, maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`git ${args.filter(a => !a.startsWith('-c') && !a.includes('=')).join(' ')} failed in ${cwd}: ${result.error?.message || result.stderr.trim()}`);
  return result.stdout.trim();
}

const workspaceGit = (workspace, hooksDir, args) => git(['-c', `core.hooksPath=${hooksDir}`, ...GIT_IDENTITY, ...args], workspace);

export function resolveNewOutput(out, root = repo) {
  if (!out) throw new Error('--out <new-folder> is required.');
  const proposed = resolve(out);
  let exists = true;
  try { lstatSync(proposed); } catch { exists = false; }
  if (exists) throw new Error(`${proposed} already exists. --out must name a new folder; the runner never reuses or overwrites one.`);
  let parent;
  try { parent = realpathSync(dirname(proposed)); } catch { throw new Error(`${dirname(proposed)} does not exist. Create the parent folder first; --out itself must be new.`); }
  const destination = join(parent, basename(proposed));
  if (within(realpathSync(root), destination)) throw new Error(`${destination} is inside this checkout. --out must be outside the source checkout so a run can never touch the repository.`);
  return destination;
}

function existingOutput(out) {
  let destination;
  try { destination = realpathSync(resolve(out)); } catch { throw new Error(`${resolve(out)} does not exist. Run --prepare --out <dir> first.`); }
  if (within(realpathSync(repo), destination)) throw new Error(`${destination} is inside this checkout; prepared rounds live outside it.`);
  const freezePath = join(destination, 'freeze.json');
  if (!existsSync(freezePath)) throw new Error(`${freezePath} is missing. --prepare writes it last; an incomplete preparation cannot be run or reported.`);
  return { destination, freeze: readJson(freezePath) };
}

function changedFrozenFiles(freeze, root = repo) {
  return FROZEN_FILES.filter(path => freeze.protocol?.[path] !== fileHash(join(root, path)));
}

function requireUnchangedProtocol(freeze, root) {
  const changed = changedFrozenFiles(freeze, root);
  if (changed.length) throw new Error(`Pre-registered files changed since --prepare: ${changed.join(', ')}. A round cannot change mid-run; restore them or prepare a new round with a dated amendment.`);
}

function requirePreparedRun(freeze, destination, options) {
  if (!freeze.arms[options.arm]) throw new Error(`${options.arm} was not prepared in ${destination} (prepared: ${Object.keys(freeze.arms).join(', ')}).`);
  if (options.runIndex > freeze.runs) throw new Error(`--run-index ${options.runIndex} is beyond the ${freeze.runs} run(s) prepared in ${destination}.`);
}

// ---------------------------------------------------------------- skill trees

// Inventory of a folder: regular files only, sorted by path; the tree hash is the pin.
export function treeInventory(root) {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`${path} is a symlink; a pinned tree must hold regular files only.`);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files.push(path);
      else throw new Error(`${path} is not a regular file.`);
    }
  };
  walk(root);
  const inventory = files.map(path => {
    const bytes = readFileSync(path);
    return { path: relative(root, path).split(sep).join('/'), sha256: sha256(bytes), bytes: bytes.length };
  }).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { root, inventory, treeHash: sha256(json(inventory)), files: inventory.length, bytes: inventory.reduce((sum, file) => sum + file.bytes, 0) };
}

function verifySkillTree(arm, dir) {
  const tree = treeInventory(dir);
  const pin = arm.skill.pin;
  if (tree.treeHash !== pin.treeHash) {
    throw new Error(`${arm.id}: the skill tree at ${dir} hashes to ${tree.treeHash} (${tree.files} files), but ${DRIFT_DIR}/arms.json pins ${pin.treeHash} (${pin.files} files). The source moved or the copy differs: supply the pinned tree with --skill-dir ${arm.id}=<dir>, or amend the pin in arms.json and PROTOCOL.md before any run.`);
  }
  return tree;
}

function installSkill(arm, cacheDir, npmCache) {
  mkdirSync(cacheDir, { recursive: true, mode: 0o700 });
  const args = ['-y', arm.skill.installer, 'add', arm.skill.source, '--skill', arm.skill.skillName, '-a', 'codex', '-y', '--copy'];
  const result = spawnSync(posix ? 'npx' : 'npx.cmd', args, {
    cwd: cacheDir, encoding: 'utf8', timeout: 10 * 60000, shell: !posix, maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, npm_config_cache: npmCache, DO_NOT_TRACK: '1', DISABLE_TELEMETRY: '1' },
  });
  writeFileSync(join(cacheDir, 'install.log'), `npx ${args.join(' ')}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  if (result.error || result.status !== 0) throw new Error(`${arm.id}: npx ${args.join(' ')} failed (${result.error?.message || `exit ${result.status}`}); see ${join(cacheDir, 'install.log')}.`);
  const installed = join(cacheDir, ...arm.skill.installDir.split('/'));
  if (!existsSync(installed)) throw new Error(`${arm.id}: the installer did not create ${arm.skill.installDir} in ${cacheDir}.`);
  let computedHash = null;
  try { computedHash = readJson(join(cacheDir, 'skills-lock.json')).skills?.[arm.skill.skillName]?.computedHash ?? null; } catch {}
  return { dir: installed, computedHash };
}

// ---------------------------------------------------------------- --prepare

function safeParts(path) {
  const parts = path.split('/');
  if (!path || path.includes('\\') || path.includes('\0') || isAbsolute(path) || parts.some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe workspace path: ${path}`);
  return parts;
}

function saveExclusive(path, bytes) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, bytes, { flag: 'wx', mode: 0o600 });
}

export function workspaceFiles(kit, arm) {
  const source = kit.arms[arm.kit];
  if (!source) throw new Error(`${DRIFT_DIR}/arms.json: ${arm.id} names kit arm ${arm.kit}; prepare-design-pilot only provides A-D.`);
  const files = {};
  for (const [path, bytes] of Object.entries(source)) if (!REMOVED_KIT_FILES.includes(path)) files[path] = bytes;
  files['AGENTS.md'] = NEUTRAL_AGENTS;
  files['.gitignore'] = GITIGNORE;
  return files;
}

function initWorkspaceRepository(workspace, hooksDir) {
  workspaceGit(workspace, hooksDir, ['init', '-q']);
  workspaceGit(workspace, hooksDir, ['add', '-A']);
  workspaceGit(workspace, hooksDir, ['commit', '-q', '--no-verify', '-m', 'Starter']);
  return workspaceGit(workspace, hooksDir, ['rev-parse', 'HEAD']);
}

export async function prepare(options, { root = repo, env = process.env, log = console.log } = {}) {
  const destination = resolveNewOutput(options.out, root);
  const protocol = loadProtocol(root);
  const arms = selectArms(protocol, options.round, options.arms);
  for (const arm of arms) {
    if (arm.skill && !arm.skill.pin) throw new Error(`${arm.id} has no pin in ${DRIFT_DIR}/arms.json. Pin it (and record a dated amendment in PROTOCOL.md) before preparing the ${options.round} round.`);
  }
  for (const id of Object.keys(options.skillDirs || {})) {
    const arm = arms.find(item => item.id === id);
    if (!arm || !arm.skill?.pin?.treeHash) throw new Error(`--skill-dir ${id}: only prepared third-party arms with a tree pin take a local skill folder.`);
  }
  const isolated = !options.noIsolatedHome;
  const realHome = codexHomeState(env);
  const model = options.model || realHome.configModel;
  if (!model) throw new Error(`No model: pass --model <id>, or set model = "<id>" in ${join(realHome.home, 'config.toml')}.`);
  const configText = isolatedConfig({ model, effort: options.effort });
  const authPath = isolated ? authPathFor(options, env) : null;
  const guard = isolated ? null : guardGlobalSkills({ allow: options.allowGlobalSkills, env });
  const commit = git(['rev-parse', 'HEAD'], root);
  const dirty = git(['status', '--porcelain', '--untracked-files=all'], root).length > 0;
  if (dirty && !options.allowDirty) throw new Error('The checkout has uncommitted changes. Prepare a pre-registered round from a clean commit, or pass --allow-dirty (recorded in freeze.json).');
  const version = codexVersion(env);
  const kit = buildPilotPlan(root);
  const catalogPath = '.agents/skills/styleseed/workflows/ss-resolve/references/catalog.json';
  for (const arm of arms.filter(item => item.skill?.pin?.engineRevision)) {
    const catalog = JSON.parse(kit.arms[arm.kit][catalogPath]);
    if (catalog.engineRevision !== arm.skill.pin.engineRevision) {
      throw new Error(`${arm.id}: this checkout's engine revision is ${catalog.engineRevision}, but ${DRIFT_DIR}/arms.json pins ${arm.skill.pin.engineRevision}. The baseline round runs from a checkout at the pinned revision; use one, or amend the pin with a dated line in PROTOCOL.md before any run.`);
    }
  }
  const localTrees = {};
  for (const [id, dir] of Object.entries(options.skillDirs || {})) localTrees[id] = verifySkillTree(arms.find(arm => arm.id === id), resolve(dir));

  // Every check that needs no network has passed; from here on the folder exists.
  mkdirSync(destination, { mode: 0o700 });
  const hooksDir = join(destination, '.empty-hooks');
  mkdirSync(hooksDir, { mode: 0o700 });
  let isolation;
  if (isolated) {
    const template = createIsolatedHome(join(destination, 'home'), { authPath, configText, link: false });
    const record = { auth: { path: authPath, link: 'created in each session or preflight home, removed when its Codex process exits' }, config: { sha256: sha256(configText) } };
    const { sessionEnv, browserCache } = resolveSessionEnv({ platform: process.platform, env });
    isolation = {
      mode: 'isolated', home: 'home', sessionEnvironment: ['HOME', 'CODEX_HOME', ...Object.keys(sessionEnv)],
      sessionEnv, browserCache,
      auth: record.auth,
      config: { file: 'home/.codex/config.toml', keys: ISOLATED_CONFIG_KEYS, text: configText, sha256: record.config.sha256 },
      check: checkIsolatedHome(template, record, { template: true }),
      notCarriedOver: notCarriedOver(env),
    };
  } else {
    isolation = { mode: 'none', globalSkills: guard, sessionEnv: null, sessionEnvApplied: false, note: 'Without isolation the sessions use the real environment as is; sessionEnv is not applied.' };
  }
  isolation.realCodexHome = realHome;

  const npmCache = join(destination, '.npm-cache');
  const trees = {};
  for (const arm of arms.filter(item => item.skill?.pin?.treeHash)) {
    if (localTrees[arm.id]) { trees[arm.id] = { tree: localTrees[arm.id], from: 'skill-dir', computedHash: null }; continue; }
    log(`Installing ${arm.id} from ${arm.skill.source} (${arm.skill.installer})…`);
    const installed = installSkill(arm, join(destination, '.skill-cache', arm.id), npmCache);
    trees[arm.id] = { tree: verifySkillTree(arm, installed.dir), from: 'network', computedHash: installed.computedHash };
  }

  const prompts = {};
  for (const arm of arms) prompts[arm.id] = protocol.screens.map(screen => [screen.order, renderPrompt(protocol, arm, screen)]);
  const writeRunFiles = (base, arm) => {
    for (const [path, bytes] of Object.entries(workspaceFiles(kit, arm))) saveExclusive(join(base, 'workspace', ...safeParts(path)), bytes);
    const tree = trees[arm.id]?.tree;
    if (tree) {
      for (const entry of tree.inventory) {
        saveExclusive(join(base, 'workspace', ...safeParts(arm.skill.installDir), ...safeParts(entry.path)), readFileSync(join(tree.root, ...entry.path.split('/'))));
      }
    }
    for (const [order, text] of prompts[arm.id]) saveExclusive(join(base, 'prompts', `session-${order}.md`), text);
  };
  const starters = {};
  for (const arm of arms) {
    // A pristine copy for --replace; the same files every run of the arm starts from.
    writeRunFiles(join(destination, arm.id, 'starter'), arm);
    starters[arm.id] = treeInventory(join(destination, arm.id, 'starter')).treeHash;
  }
  const workspaces = {};
  for (let n = 1; n <= options.runs; n++) {
    for (const arm of arms) {
      const base = join(destination, arm.id, `run-${n}`);
      writeRunFiles(base, arm);
      (workspaces[arm.id] ||= {})[`run-${n}`] = { starterCommit: initWorkspaceRepository(join(base, 'workspace'), hooksDir) };
    }
  }

  const freeze = {
    schemaVersion: 1, tool: 's1-drift-runner', status: 'prepared-not-run', round: options.round, preparedAt: new Date().toISOString(),
    repository: { commit, dirty, allowDirty: Boolean(options.allowDirty) },
    protocol: Object.fromEntries(FROZEN_FILES.map(path => [path, fileHash(join(root, path))])),
    runner: { path: RUNNER_FILE, sha256: fileHash(join(root, RUNNER_FILE)) },
    kit: {
      sourceRevision: kit.manifest.sourceRevision, checkoutDirty: kit.manifest.checkoutDirty, inputHash: kit.manifest.inputHash,
      commonHash: kit.manifest.commonHash, engineVersion: kit.manifest.engineVersion, engineRevision: kit.manifest.engineRevision,
      arms: Object.fromEntries([...new Set(arms.map(arm => arm.kit))].map(id => [id, kit.manifest.arms[id].hash])),
      fixtureFiles: Object.fromEntries(FIXTURE_FILES.map(path => [path, sha256(kit.common[path])])),
      removedFromWorkspace: REMOVED_KIT_FILES, addedToWorkspace: { 'AGENTS.md': sha256(NEUTRAL_AGENTS), '.gitignore': sha256(GITIGNORE) },
    },
    arms: Object.fromEntries(arms.map(arm => [arm.id, {
      label: arm.label, kit: arm.kit, methodLine: arm.methodLine,
      skill: arm.skill ? {
        source: arm.skill.source, skillName: arm.skill.skillName, installDir: arm.skill.installDir, installer: arm.skill.installer, pin: arm.skill.pin,
        installed: trees[arm.id] ? { from: trees[arm.id].from, treeHash: trees[arm.id].tree.treeHash, files: trees[arm.id].tree.files, bytes: trees[arm.id].tree.bytes, computedHash: trees[arm.id].computedHash } : { from: `prepare-design-pilot arm ${arm.kit}`, engineRevision: kit.manifest.engineRevision },
      } : null,
    }])),
    runs: options.runs,
    replacements: { maxPerArm: MAX_REPLACEMENTS, appliesTo: 'infrastructure', order: 'run index', discretionary: false },
    remeasures: { maxPerRun: MAX_REMEASURES, appliesTo: 'infrastructure failures in the floor phase after all sessions finished' },
    screens: protocol.screens.map(({ id, order, route }) => ({ id, order, route })),
    prompts: Object.fromEntries(arms.map(arm => [arm.id, Object.fromEntries(prompts[arm.id].map(([order, text]) => [`session-${order}`, sha256(text)]))])),
    starters,
    codex: {
      command: codexCommand(env).label, version, model, modelSource: options.model ? 'option' : 'codex-config', effort: options.effort,
      sessionTimeoutMinutes: options.timeoutMinutes, attempts: 1, retries: 0,
      args: codexArgs({ workspace: '<workspace>', model, effort: options.effort, lastMessage: '<run>/sessions/<n>/last-message.md' }),
    },
    isolation,
    node: process.version, platform: `${process.platform}-${process.arch}`,
    workspaces,
  };
  writeFileSync(join(destination, 'freeze.json'), json(freeze), { flag: 'wx', mode: 0o600 });
  return { destination, freeze };
}

// ---------------------------------------------------------------- processes

function killTree(child, signal = 'SIGTERM') {
  if (!child?.pid) return;
  try { if (posix) process.kill(-child.pid, signal); else child.kill(signal); } catch {}
}

function runProcess(bin, args, { cwd, stdinPath = null, logPath, timeoutMs, env = process.env }) {
  return new Promise(done => {
    const started = Date.now();
    const input = stdinPath ? openSync(stdinPath, 'r') : 'ignore';
    const output = openSync(logPath, 'a');
    let timedOut = false;
    let settled = false;
    const child = spawn(bin, args, { cwd, stdio: [input, output, output], detached: posix, env });
    activeChildren.add(child);
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child, 'SIGTERM');
      setTimeout(() => killTree(child, 'SIGKILL'), 10000).unref();
    }, timeoutMs);
    const finish = (exitCode, signal, error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeChildren.delete(child);
      killTree(child, 'SIGTERM'); // anything the session left running in its process group
      if (typeof input === 'number') closeSync(input);
      closeSync(output);
      done({ exitCode, signal, error, timedOut, seconds: Math.round((Date.now() - started) / 1000) });
    };
    child.once('error', error => finish(null, null, error.message));
    child.once('exit', (code, signal) => finish(code, signal));
  });
}

// Signal handling shared by --run and --remeasure: an operator abort is recorded, not lost.
function trapSignals(state, log) {
  const onSignal = signal => {
    if (!state.aborted) { state.aborted = signal; log(`${signal}: stopping; the run is recorded as an operator abort.`); }
    for (const child of activeChildren) killTree(child, 'SIGTERM');
    killTree(state.server, 'SIGTERM');
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  return () => { process.off('SIGINT', onSignal); process.off('SIGTERM', onSignal); };
}

// ---------------------------------------------------------------- --preflight

export function preflightCommand({ freeze, destination, id, env = process.env }) {
  const home = join(destination, 'home', 'preflight', id);
  const work = join(home, 'work');
  const lastMessage = join(home, 'last-message.md');
  const codex = codexCommand(env);
  const args = ['exec', '--skip-git-repo-check', ...codexArgs({ workspace: work, model: freeze.codex.model, effort: freeze.codex.effort, lastMessage }).slice(1)];
  return {
    home, work, lastMessage, promptPath: join(home, 'prompt.md'), logPath: join(home, 'codex.log'),
    bin: codex.bin, args: [...codex.prefix, ...args], codexArgs: args, env: sessionEnvironment(env, home, freeze.isolation?.sessionEnv ?? {}), prompt: PREFLIGHT_PROMPT,
  };
}

export async function preflight(options, { root = repo, env = process.env, log = console.log } = {}) {
  const { destination, freeze } = existingOutput(options.out);
  return startUp(destination, freeze, 'preflight', log, async () => {
    requireNoAuthMarker(destination);
    requireUnchangedProtocol(freeze, root);
    if (freeze.isolation?.mode !== 'isolated') throw new Error(`${join(destination, 'freeze.json')}: this round was prepared without an isolated home; the preflight checks that home.`);
    checkIsolatedHome(join(destination, 'home'), freeze.isolation, { template: true });
    const id = `${new Date().toISOString().replace(/[:.]/gu, '-')}-${shortId()}`;
    const command = preflightCommand({ freeze, destination, id, env });
    try {
      createIsolatedHome(command.home, { authPath: freeze.isolation.auth.path, configText: freeze.isolation.config.text });
      mkdirSync(command.work, { mode: 0o700 });
      writeFileSync(command.promptPath, command.prompt, { flag: 'wx', mode: 0o600 });
      log(`Preflight: one codex exec in ${command.work}…`);
      const result = await runProcess(command.bin, command.args, { cwd: command.work, stdinPath: command.promptPath, logPath: command.logPath, timeoutMs: 5 * 60000, env: command.env });
      const authLink = releaseAuthLink(command.home);
      const header = parseCodexHeader(readFileSync(command.logPath, 'utf8'));
      const reply = existsSync(command.lastMessage) ? readFileSync(command.lastMessage, 'utf8').trim() : '';
      const checks = {
        exit: result.exitCode === 0 && !result.timedOut,
        model: header.model === freeze.codex.model,
        effort: header.effort === freeze.codex.effort,
        oneWordReply: /^[A-Za-z.!]+$/u.test(reply),
        workUntouched: readdirSync(command.work).length === 0,
        authLinkSurvived: authLink.state === 'removed',
      };
      const passed = Object.values(checks).every(Boolean);
      const record = {
        tool: 's1-drift-runner', mode: 'preflight', at: new Date().toISOString(), passed, checks, authLink: authLink.state,
        expected: { model: freeze.codex.model, effort: freeze.codex.effort }, observed: header, reply: reply.slice(0, 80),
        process: result, home: relative(destination, command.home), args: command.codexArgs,
      };
      if (authLink.state === 'file') {
        record.authMarker = writeAuthMarker(destination, { where: 'during the preflight', written: authLink.path, real: freeze.isolation.auth.path });
      }
      writeFileSync(join(command.home, 'preflight.json'), json(record), { flag: 'wx', mode: 0o600 });
      return record;
    } finally {
      // No auth link stays at rest, whatever happened above.
      sweepAuthLinks(destination, { realAuthPath: freeze.isolation.auth.path, log });
    }
  });
}

// ---------------------------------------------------------------- --run: install and sessions

export function nodeModulesMismatches(nodeModules, lock) {
  const root = lock.packages?.[''] ?? {};
  const names = Object.keys({ ...(root.dependencies || {}), ...(root.devDependencies || {}) }).sort();
  const mismatches = [];
  for (const name of names) {
    const expected = lock.packages?.[`node_modules/${name}`]?.version ?? null;
    let actual = null;
    try { actual = readJson(join(nodeModules, ...name.split('/'), 'package.json')).version ?? null; } catch {}
    if (expected !== actual) mismatches.push({ name, expected, actual });
  }
  return mismatches;
}

function installDependencies({ workspace, nodeModules, npmCache, logPath }) {
  const started = Date.now();
  const target = join(workspace, 'node_modules');
  const note = text => writeFileSync(logPath, `[${new Date().toISOString()}] ${text}\n`, { flag: 'a' });
  if (nodeModules) {
    const source = realpathSync(resolve(nodeModules));
    if (!statSync(source).isDirectory()) throw new Error(`--node-modules ${source} is not a folder.`);
    const mismatches = nodeModulesMismatches(source, readJson(join(workspace, 'package-lock.json')));
    if (mismatches.length) throw new Error(`--node-modules ${source} does not match the workspace lock: ${mismatches.slice(0, 8).map(m => `${m.name} ${m.actual ?? 'missing'} (lock ${m.expected})`).join(', ')}. Pass a matching install or omit --node-modules to run npm ci.`);
    let method = 'cp -cR';
    const clone = posix ? spawnSync('cp', ['-cR', source, target], { encoding: 'utf8', timeout: 30 * 60000 }) : { status: 1 };
    if (clone.error || clone.status !== 0) {
      rmSync(target, { recursive: true, force: true });
      cpSync(source, target, { recursive: true, verbatimSymlinks: true });
      method = 'copy';
    }
    note(`node_modules from ${source} by ${method}`);
    return { method, source, seconds: Math.round((Date.now() - started) / 1000) };
  }
  const result = spawnSync(npmCommand, ['ci', '--no-audit', '--no-fund'], {
    cwd: workspace, encoding: 'utf8', timeout: 30 * 60000, shell: !posix, maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, npm_config_cache: npmCache, NEXT_TELEMETRY_DISABLED: '1' },
  });
  note(`npm ci exit ${result.status}\n${result.stdout ?? ''}${result.stderr ?? ''}`);
  if (result.error || result.status !== 0) throw new Error(`npm ci failed in ${workspace} (${result.error?.message || `exit ${result.status}`}); see ${logPath}. No session has started: repeat --run.`);
  return { method: 'npm ci', source: null, seconds: Math.round((Date.now() - started) / 1000) };
}

// Classification of a failed session (top-up rule): a session that could not start Codex, or a
// first session that ended before producing anything, is infrastructure; any other failure or a
// timeout is an agent outcome.
export function sessionFailure({ order, result, lastMessage, changedFiles, aborted, timeoutMinutes }) {
  if (aborted) return { kind: 'infrastructure', reason: `operator abort (${aborted}) during session ${order}` };
  if (result.error) return { kind: 'infrastructure', reason: `session ${order} could not start Codex: ${result.error}` };
  if (result.timedOut) return { kind: 'agent', reason: `session ${order} timed out after ${timeoutMinutes} minutes` };
  if (result.exitCode === 0) return null;
  const ended = `exit ${result.exitCode}${result.signal ? ` (${result.signal})` : ''}`;
  if (order === 1 && !lastMessage && changedFiles === 0) return { kind: 'infrastructure', reason: `session 1 ended with ${ended} before producing any output (network, service or login outage)` };
  return { kind: 'agent', reason: `session ${order} ended with ${ended}` };
}

function runIsolation(options, freeze, destination, env) {
  if (options.noIsolatedHome) {
    return { mode: 'none', globalSkills: guardGlobalSkills({ allow: options.allowGlobalSkills, env }), sessionEnvApplied: false, note: 'The real environment was used as is; sessionEnv was not applied.' };
  }
  if (freeze.isolation?.mode !== 'isolated') {
    throw new Error(`${join(destination, 'freeze.json')}: this round was prepared without an isolated home. Pass --no-isolated-home --allow-global-skills to run without isolation (recorded as isolation: none), or prepare a new round.`);
  }
  return {
    mode: 'isolated', sessionEnvApplied: true, sessionEnv: freeze.isolation.sessionEnv, browserCache: freeze.isolation.browserCache,
    check: checkIsolatedHome(join(destination, 'home'), freeze.isolation, { template: true }), notCarriedOver: notCarriedOver(env),
  };
}

// ---------------------------------------------------------------- floor and measurement

async function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => done(port)); });
  });
}

async function waitForServer(url, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited with ${child.exitCode} before serving ${url}`);
    try { await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(3000) }); return; } catch {}
    await new Promise(next => setTimeout(next, 1000));
  }
  throw new Error(`next start did not answer ${url} within ${Math.round(timeoutMs / 1000)} s`);
}

async function checkRoutes(browser, origin, screens, base) {
  const results = [];
  for (const screen of screens) {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const pageErrors = [];
      let consoleErrors = 0;
      page.on('pageerror', error => pageErrors.push(String(error.message).slice(0, 300)));
      page.on('console', message => { if (message.type() === 'error') consoleErrors++; });
      const url = `${origin}${screen.route}`;
      let status = null;
      try {
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => page.goto(url, { waitUntil: 'load', timeout: 45000 }));
        status = response ? response.status() : null;
      } catch (error) { pageErrors.push(`navigation failed: ${String(error.message).slice(0, 300)}`); }
      await page.waitForTimeout(500);
      const width = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth })).catch(() => null);
      const shot = join(base, 'screens', viewport.id, `${screen.id}.png`);
      mkdirSync(dirname(shot), { recursive: true });
      let screenshot = null;
      try { await page.screenshot({ path: shot, fullPage: true }); screenshot = `screens/${viewport.id}/${screen.id}.png`; } catch {}
      await context.close();
      results.push({ screen: screen.id, route: screen.route, viewport: viewport.id, status, pageErrors, consoleErrors, overflow: width ? width.scrollWidth > width.clientWidth : null, width, screenshot });
    }
  }
  return results;
}

export function floorReasons(routes) {
  const reasons = [];
  for (const item of routes) {
    if (item.status !== 200) reasons.push(`${item.route} at ${item.viewport} returned ${item.status ?? 'no response'}`);
    if (item.pageErrors.length) reasons.push(`${item.route} at ${item.viewport} had ${item.pageErrors.length} uncaught page error(s)`);
    if (item.viewport === '390' && item.overflow !== false) reasons.push(`${item.route} at 390 ${item.overflow === null ? 'could not be checked for' : 'has'} horizontal overflow`);
  }
  return reasons;
}

// The functional floor and the measurement, shared by --run and --remeasure. Every failure it
// records is in phase `floor`; agent-written code runs with a fresh empty HOME.
async function runFloorAndMeasurement({ root, destination, base, workspace, freeze, protocol, options, env, log, fail, state, record }) {
  state.phase = 'floor';
  const npmCache = join(destination, '.npm-cache');
  const floorHome = join(destination, 'home', 'floor', `${record.arm}-run-${record.runIndex}-${shortId()}`);
  mkdirSync(floorHome, { recursive: true, mode: 0o700 });
  mkdirSync(join(base, 'floor'), { recursive: true, mode: 0o700 });
  const floor = { home: relative(destination, floorHome), fixtureFiles: {}, modelTest: null, build: null, serve: null, routes: [] };
  record.floor = floor;
  const childEnv = extra => floorEnvironment(env, floorHome, { extra });
  for (const [path, expected] of Object.entries(freeze.kit.fixtureFiles)) {
    const actual = fileHash(join(workspace, ...path.split('/')));
    floor.fixtureFiles[path] = actual === expected ? 'unchanged' : actual ? 'changed' : 'missing';
    if (actual !== expected) fail('agent', `${path} is ${floor.fixtureFiles[path]}; the kit's model tests must pass unchanged`);
  }
  const test = spawnSync(process.execPath, ['--test', 'fixture/model.test.mjs'], { cwd: workspace, encoding: 'utf8', timeout: 5 * 60000, env: childEnv({}) });
  writeFileSync(join(base, 'floor', 'model-test.log'), `${test.stdout ?? ''}${test.stderr ?? ''}`);
  floor.modelTest = { exitCode: test.status, signal: test.signal };
  await settleSignals();
  if (state.aborted || test.signal === 'SIGINT') { fail('infrastructure', `operator abort (${state.aborted || test.signal}) during the model tests`); return; }
  if (test.status !== 0) fail('agent', 'node --test fixture/model.test.mjs failed');
  log('Building…');
  const buildStarted = Date.now();
  const build = spawnSync(npmCommand, ['run', 'build'], {
    cwd: workspace, encoding: 'utf8', timeout: 20 * 60000, shell: !posix, maxBuffer: 256 * 1024 * 1024,
    env: childEnv({ npm_config_cache: npmCache, NEXT_TELEMETRY_DISABLED: '1' }),
  });
  writeFileSync(join(base, 'floor', 'build.log'), `${build.stdout ?? ''}${build.stderr ?? ''}`);
  floor.build = { exitCode: build.status, signal: build.signal, seconds: Math.round((Date.now() - buildStarted) / 1000) };
  await settleSignals();
  if (state.aborted || build.signal === 'SIGINT') { fail('infrastructure', `operator abort (${state.aborted || build.signal}) during the build`); return; }
  if (build.error?.code === 'ETIMEDOUT') { fail('agent', 'npm run build timed out after 20 minutes'); return; }
  if (build.status !== 0) { fail('agent', 'npm run build failed'); return; }
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const serverLog = openSync(join(base, 'floor', 'server.log'), 'a');
  state.server = spawn(process.execPath, [join(workspace, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
    cwd: workspace, stdio: ['ignore', serverLog, serverLog], detached: posix, env: childEnv({ NEXT_TELEMETRY_DISABLED: '1' }),
  });
  closeSync(serverLog);
  try { await waitForServer(`${origin}${protocol.screens[0].route}`, state.server, 90000); floor.serve = 'ok'; } catch (error) {
    floor.serve = error.message;
    if (state.aborted) fail('infrastructure', `operator abort (${state.aborted}) while starting the app`);
    else fail('agent', `the built app did not serve: ${error.message}`);
    return;
  }
  const { chromium, from } = await loadBrowser(options.browser || env.STYLESEED_BROWSER_MODULE || join(root, 'demo-pricing', 'node_modules', 'playwright', 'index.mjs'));
  log('Checking the functional floor and taking screenshots…');
  const browser = await chromium.launch({ headless: true });
  try { floor.routes = await checkRoutes(browser, origin, protocol.screens, base); } finally { await browser.close(); }
  for (const reason of floorReasons(floor.routes)) fail('agent', reason);
  log('Measuring…');
  const measured = await observeUrls(protocol.screens.map(screen => `${origin}${screen.route}`), { chromium, viewports: VIEWPORTS.map(({ width, height }) => ({ width, height })) });
  const observedAt = new Date().toISOString();
  const browserName = String(from).replace(/^.*node_modules[\\/]/u, '');
  const perViewport = {};
  VIEWPORTS.forEach((viewport, v) => {
    perViewport[viewport.id] = protocol.screens.map((screen, i) => {
      const observation = measured[i].observations[v];
      const summary = summarize([observation]);
      saveExclusive(join(base, 'measurements', viewport.id, `${screen.id}.json`), json({ tool: 's1-drift-runner', screen: screen.id, route: screen.route, viewport: { width: viewport.width, height: viewport.height }, observedAt, browser: browserName, summary, observation }));
      return { id: screen.id, summary };
    });
  });
  const drift = { tool: 's1-drift-metric', primaryViewport: '1440', viewports: Object.fromEntries(VIEWPORTS.map(viewport => [viewport.id, driftMetric(perViewport[viewport.id], { viewport: viewport.id })])) };
  saveExclusive(join(base, 'drift.json'), json(drift));
  record.measurement = { observedAt, browser: browserName, primary: drift.viewports['1440'].primary, primary390: drift.viewports['390'].primary };
}

function finishRecord(record, state, started) {
  if (state.aborted && !record.failures.length) record.failures.push({ kind: 'infrastructure', phase: state.phase, reason: `operator abort (${state.aborted})` });
  record.reasons = record.failures.map(failure => failure.reason);
  record.invalidKind = classifyFailures(record.failures);
  record.valid = record.failures.length === 0;
  record.endedAt = new Date().toISOString();
  record.seconds = Math.round((Date.now() - started) / 1000);
}

// ---------------------------------------------------------------- --run

export async function runOne(options, context = {}) {
  const { destination, freeze } = existingOutput(options.out);
  return startUp(destination, freeze, 'run', context.log ?? console.log, () => runLocked(destination, freeze, options, context));
}

async function runLocked(destination, freeze, options, { root = repo, env = process.env, log = console.log } = {}) {
  requireNoAuthMarker(destination);
  requireUnchangedProtocol(freeze, root);
  requirePreparedRun(freeze, destination, options);
  const base = join(destination, options.arm, `run-${options.runIndex}`);
  const workspace = join(base, 'workspace');
  if (!existsSync(workspace)) throw new Error(`${workspace} is missing; it is created by --prepare (or --replace).`);
  if (existsSync(join(base, 'run.json')) || existsSync(join(base, 'sessions'))) throw new Error(`${base} was already started. One attempt per run and no retries; an infrastructure failure is remeasured or replaced (see --report).`);
  const isolation = runIsolation(options, freeze, destination, env);
  const protocol = loadProtocol(root);
  const hooksDir = join(destination, '.empty-hooks');
  const npmCache = join(destination, '.npm-cache');
  const codex = codexCommand(env);
  // Dependencies are an operator step: if this fails, no session has started and --run can be repeated.
  log(`Installing dependencies in ${workspace}…`);
  rmSync(join(workspace, 'node_modules'), { recursive: true, force: true });
  const install = installDependencies({ workspace, nodeModules: options.nodeModules, npmCache, logPath: join(base, 'install.log') });
  // From here on the run counts: the sessions folder marks it as started.
  mkdirSync(join(base, 'sessions'), { mode: 0o700 });
  const record = {
    schemaVersion: 1, tool: 's1-drift-runner', arm: options.arm, runIndex: options.runIndex, round: freeze.round,
    valid: false, invalidKind: null, reasons: [], failures: [], remeasured: 0, startedAt: new Date().toISOString(), endedAt: null,
    screens: protocol.screens.map(({ id, order, route }) => ({ id, order, route })),
    codex: { model: freeze.codex.model, effort: freeze.codex.effort, sessionTimeoutMinutes: freeze.codex.sessionTimeoutMinutes },
    isolation, install, sessions: [], floor: null, measurement: null, notes: [],
  };
  const state = { aborted: null, server: null, phase: 'sessions' };
  const fail = (kind, reason) => record.failures.push({ kind, phase: state.phase, reason });
  const started = Date.now();
  const release = trapSignals(state, log);
  try {
    let head = workspaceGit(workspace, hooksDir, ['rev-parse', 'HEAD']);
    for (const screen of protocol.screens) {
      if (state.aborted) { fail('infrastructure', `operator abort (${state.aborted}) before session ${screen.order}`); break; }
      const dir = join(base, 'sessions', String(screen.order));
      mkdirSync(dir, { mode: 0o700 });
      const promptPath = join(base, 'prompts', `session-${screen.order}.md`);
      if (fileHash(promptPath) !== freeze.prompts[options.arm][`session-${screen.order}`]) { fail('infrastructure', `prompt for session ${screen.order} differs from freeze.json`); break; }
      let sessionHome = null;
      if (isolation.mode === 'isolated') {
        sessionHome = createIsolatedHome(join(destination, 'home', 'sessions', `${options.arm}-run-${options.runIndex}-s${screen.order}-${shortId()}`), { authPath: freeze.isolation.auth.path, configText: freeze.isolation.config.text });
        checkIsolatedHome(sessionHome, freeze.isolation);
      }
      log(`Session ${screen.order}/${protocol.screens.length}: ${screen.id}…`);
      const lastMessagePath = join(dir, 'last-message.md');
      const args = codexArgs({ workspace, model: freeze.codex.model, effort: freeze.codex.effort, lastMessage: lastMessagePath });
      const logPath = join(dir, 'codex.log');
      const result = await runProcess(codex.bin, [...codex.prefix, ...args], {
        cwd: workspace, stdinPath: promptPath, logPath, timeoutMs: freeze.codex.sessionTimeoutMinutes * 60000,
        env: sessionHome ? sessionEnvironment(env, sessionHome, freeze.isolation.sessionEnv ?? {}) : env,
      });
      // The Codex process has exited: its home keeps no auth link at rest.
      const authLink = sessionHome ? releaseAuthLink(sessionHome) : null;
      const authReplaced = authLink?.state === 'file';
      const observed = parseCodexHeader(readFileSync(logPath, 'utf8'));
      const session = { order: screen.order, screen: screen.id, ...result, observedModel: observed.model, observedEffort: observed.effort, home: sessionHome ? relative(destination, sessionHome) : null, authLink: authLink?.state ?? null, commit: null, changedFiles: null };
      if (authLink?.state === 'missing') record.notes.push(`session ${screen.order}: the auth link was missing when Codex exited`);
      try {
        workspaceGit(workspace, hooksDir, ['add', '-A']);
        workspaceGit(workspace, hooksDir, ['commit', '-q', '--no-verify', '--allow-empty', '-m', `Session ${screen.order}: ${screen.id}`]);
        const after = workspaceGit(workspace, hooksDir, ['rev-parse', 'HEAD']);
        const changes = workspaceGit(workspace, hooksDir, ['diff', '--name-status', head, after]);
        writeFileSync(join(dir, 'changes.txt'), `${changes}\n`);
        session.commit = after;
        session.changedFiles = changes ? changes.split('\n').length : 0;
        head = after;
      } catch (error) { record.notes.push(`session ${screen.order} snapshot failed: ${error.message}`); }
      record.sessions.push(session);
      if (authReplaced) {
        // The real auth file may now hold a stale login: stop before any later session or the floor.
        fail('infrastructure', `Codex replaced the auth link in the isolated home during session ${screen.order}`);
        record.authMarker = writeAuthMarker(destination, { where: `during session ${screen.order} of ${options.arm} run ${options.runIndex}`, written: authLink.path, real: freeze.isolation.auth.path });
        log(readFileSync(record.authMarker, 'utf8'));
        break;
      }
      const lastMessage = existsSync(lastMessagePath) ? readFileSync(lastMessagePath, 'utf8').trim() : '';
      const failure = sessionFailure({ order: screen.order, result, lastMessage, changedFiles: session.changedFiles, aborted: state.aborted, timeoutMinutes: freeze.codex.sessionTimeoutMinutes });
      if (failure) fail(failure.kind, failure.reason);
      if (!state.aborted && observed.model && observed.model !== freeze.codex.model) fail('infrastructure', `session ${screen.order} ran model ${observed.model}, frozen ${freeze.codex.model}`);
      if (!state.aborted && observed.effort && observed.effort !== freeze.codex.effort) fail('infrastructure', `session ${screen.order} ran effort ${observed.effort}, frozen ${freeze.codex.effort}`);
      if (!observed.model || !observed.effort) record.notes.push(`session ${screen.order}: model or effort not found in the Codex log header; not verified`);
      if (record.failures.length) break;
    }
    if (!record.failures.length && !state.aborted) await runFloorAndMeasurement({ root, destination, base, workspace, freeze, protocol, options, env, log, fail, state, record });
  } catch (error) {
    fail('infrastructure', `runner error: ${error.message}`);
  } finally {
    killTree(state.server, 'SIGTERM');
    release();
    // A home created but never run (an error before the process exited) loses its link here.
    try { sweepAuthLinks(destination, { realAuthPath: freeze.isolation?.auth?.path ?? null, log }); } catch (error) { record.notes.push(`auth-link sweep failed: ${error.message}`); }
    finishRecord(record, state, started);
    writeFileSync(join(base, 'run.json'), json(record), { flag: 'wx', mode: 0o600 });
  }
  return { base, record };
}

// ---------------------------------------------------------------- --remeasure

// A run whose agent work is complete is measured again rather than regenerated: all sessions
// recorded, no failure in the sessions phase, and only infrastructure failures in the floor.
export function remeasureEligibility(run, { sessions = 5, max = MAX_REMEASURES } = {}) {
  if (!run) return { eligible: false, reason: 'run.json is missing' };
  if (run.valid === true) return { eligible: false, reason: 'the run is valid' };
  if ((run.sessions || []).length !== sessions) return { eligible: false, reason: `the run recorded ${(run.sessions || []).length} of ${sessions} sessions` };
  const failures = run.failures || [];
  if (!failures.length) return { eligible: false, reason: 'the run has no recorded failures to remeasure' };
  if (failures.some(failure => failure.phase !== 'floor')) return { eligible: false, reason: 'a failure happened in the sessions phase' };
  if (failures.some(failure => failure.kind !== 'infrastructure')) return { eligible: false, reason: 'the floor recorded an agent failure, a completed outcome that stays invalid' };
  if ((run.remeasured || 0) >= max) return { eligible: false, reason: `the run was already remeasured ${run.remeasured} times (at most ${max})` };
  return { eligible: true, reason: null };
}

const remeasureCommand = (destination, arm, n) => `node scripts/run-s1-drift.mjs --remeasure --out ${destination} --arm ${arm} --run-index ${n}`;
const replaceCommand = (destination, arm, n) => `node scripts/run-s1-drift.mjs --replace --out ${destination} --arm ${arm} --run-index ${n}`;

export async function remeasure(options, context = {}) {
  const { destination, freeze } = existingOutput(options.out);
  return startUp(destination, freeze, 'remeasure', context.log ?? console.log, () => remeasureLocked(destination, freeze, options, context));
}

async function remeasureLocked(destination, freeze, options, { root = repo, env = process.env, log = console.log } = {}) {
  // The floor uses no Codex login, so the marker does not block a remeasure; it is shown.
  if (existsSync(join(destination, AUTH_MARKER))) log(`${AUTH_MARKER} is present: resolve the Codex login before the next --run, --replace or --preflight.`);
  requireUnchangedProtocol(freeze, root);
  requirePreparedRun(freeze, destination, options);
  const protocol = loadProtocol(root);
  const base = join(destination, options.arm, `run-${options.runIndex}`);
  const workspace = join(base, 'workspace');
  const runFile = join(base, 'run.json');
  const previous = existsSync(runFile) ? readJson(runFile) : null;
  const eligibility = remeasureEligibility(previous, { sessions: protocol.screens.length });
  if (!eligibility.eligible) throw new Error(`${base} cannot be remeasured: ${eligibility.reason}.`);
  const hooksDir = join(destination, '.empty-hooks');
  const lastCommit = previous.sessions[previous.sessions.length - 1].commit;
  const head = workspaceGit(workspace, hooksDir, ['rev-parse', 'HEAD']);
  if (head !== lastCommit) throw new Error(`${workspace} is at ${head}, not at the session-${previous.sessions.length} commit ${lastCommit}; a remeasure measures exactly what the agent left.`);
  const status = workspaceGit(workspace, hooksDir, ['status', '--porcelain']);
  if (status) throw new Error(`${workspace} has changes since the last session:\n${status}\nRestore the workspace to the session-${previous.sessions.length} commit before remeasuring.`);
  const attempt = (previous.remeasured || 0) + 1;
  const attemptDir = join(base, 'attempts', String(attempt));
  mkdirSync(attemptDir, { recursive: true, mode: 0o700 });
  renameSync(runFile, join(base, `run.attempt-${attempt}.json`));
  for (const name of ['floor', 'measurements', 'drift.json', 'screens']) if (existsSync(join(base, name))) renameSync(join(base, name), join(attemptDir, name));
  const record = {
    ...previous, valid: false, invalidKind: null, reasons: [], failures: [], floor: null, measurement: null,
    remeasured: attempt, remeasuredAt: new Date().toISOString(), previousAttempt: `run.attempt-${attempt}.json`,
    notes: [...(previous.notes || []), `remeasure ${attempt}: the earlier floor and measurement moved to attempts/${attempt}/`],
  };
  const state = { aborted: null, server: null, phase: 'floor' };
  const fail = (kind, reason) => record.failures.push({ kind, phase: state.phase, reason });
  const started = Date.now();
  const release = trapSignals(state, log);
  try {
    await runFloorAndMeasurement({ root, destination, base, workspace, freeze, protocol, options, env, log, fail, state, record });
  } catch (error) {
    fail('infrastructure', `runner error: ${error.message}`);
  } finally {
    killTree(state.server, 'SIGTERM');
    release();
    finishRecord(record, state, started);
    writeFileSync(runFile, json(record), { flag: 'wx', mode: 0o600 });
  }
  return { base, record };
}

// ---------------------------------------------------------------- --replace (top-up rule)

export function replacementsFor(destination, arm) {
  const dir = join(destination, arm, 'replaced');
  let names = [];
  try { names = readdirSync(dir).filter(name => /^run-\d+-\d+$/u.test(name)).sort(); } catch {}
  return names.map(name => {
    let record = null;
    try { record = readJson(join(dir, name, 'replacement.json')); } catch {}
    return { folder: `${arm}/replaced/${name}`, ...(record || { reasons: ['replacement.json missing'] }) };
  });
}

// What the top-up rule says about one run: its kind, and whether it is remeasured or replaced.
export function runStatus(destination, arm, runIndex, { sessions = 5 } = {}) {
  const base = join(destination, arm, `run-${runIndex}`);
  const record = existsSync(join(base, 'run.json')) ? readJson(join(base, 'run.json')) : null;
  const started = existsSync(join(base, 'sessions')) || Boolean(record);
  const kind = record ? (record.valid === true ? null : (record.invalidKind ?? 'agent')) : started ? 'infrastructure' : null;
  const remeasurable = kind === 'infrastructure' && remeasureEligibility(record, { sessions }).eligible;
  return { runIndex, base, record, started, kind, remeasurable, replaceable: kind === 'infrastructure' && !remeasurable };
}

// Open infrastructure failures of an arm, in run-index order, with the command that resolves each.
export function pendingFor(destination, arm, runs, { sessions = 5 } = {}) {
  const used = replacementsFor(destination, arm).length;
  const open = [];
  for (let n = 1; n <= runs; n++) {
    const status = runStatus(destination, arm, n, { sessions });
    if (status.remeasurable) open.push({ run: `${arm}/run-${n}`, action: 'remeasure', command: remeasureCommand(destination, arm, n) });
    else if (status.replaceable && used < MAX_REPLACEMENTS) open.push({ run: `${arm}/run-${n}`, action: 'replace', command: replaceCommand(destination, arm, n) });
  }
  return { pending: open.length > 0, open, replacementsUsed: used };
}

export async function replaceRun(options, context = {}) {
  const { destination, freeze } = existingOutput(options.out);
  return startUp(destination, freeze, 'replace', context.log ?? console.log, () => replaceLocked(destination, freeze, options, context));
}

function replaceLocked(destination, freeze, options, { root = repo } = {}) {
  requireNoAuthMarker(destination);
  requireUnchangedProtocol(freeze, root);
  requirePreparedRun(freeze, destination, options);
  const sessions = freeze.screens.length;
  const status = runStatus(destination, options.arm, options.runIndex, { sessions });
  const base = status.base;
  if (!status.started) throw new Error(`${base} has not started; run it with --run (a failed dependency install does not start a run).`);
  if (status.record?.valid === true) throw new Error(`${base} is valid; there is nothing to replace.`);
  if (status.kind !== 'infrastructure') throw new Error(`${base} is invalid as an agent outcome (${(status.record?.reasons || []).join('; ')}). Agent outcomes are reported as invalid and never replaced.`);
  if (status.remeasurable) throw new Error(`${base} finished all its sessions and failed only in the floor for an infrastructure reason: its outcome is measured again, not regenerated. Use:\n  ${remeasureCommand(destination, options.arm, options.runIndex)}`);
  const previous = replacementsFor(destination, options.arm);
  if (previous.length >= MAX_REPLACEMENTS) throw new Error(`${options.arm} already used its ${MAX_REPLACEMENTS} replacements in this round (${previous.map(item => item.folder).join(', ')}); report the run as invalid.`);
  for (let m = 1; m < options.runIndex; m++) {
    const lower = runStatus(destination, options.arm, m, { sessions });
    if (lower.replaceable) throw new Error(`${options.arm} run ${m} is also infrastructure-invalid and replaceable; replacements go in run-index order:\n  ${replaceCommand(destination, options.arm, m)}`);
  }
  const starter = join(destination, options.arm, 'starter');
  if (!existsSync(starter) || treeInventory(starter).treeHash !== freeze.starters?.[options.arm]) throw new Error(`${starter} is missing or differs from freeze.json; a replacement must start from the pristine starter.`);
  const number = previous.length + 1;
  const target = join(destination, options.arm, 'replaced', `run-${options.runIndex}-${number}`);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  renameSync(base, target);
  const reasons = status.record ? status.record.reasons : ['run.json is missing: the harness ended without a record'];
  const record = { replacedAt: new Date().toISOString(), arm: options.arm, runIndex: options.runIndex, replacement: number, of: MAX_REPLACEMENTS, invalidKind: 'infrastructure', reasons, from: relative(destination, target) };
  for (const entry of treeInventory(starter).inventory) saveExclusive(join(base, ...safeParts(entry.path)), readFileSync(join(starter, ...entry.path.split('/'))));
  record.starterCommit = initWorkspaceRepository(join(base, 'workspace'), join(destination, '.empty-hooks'));
  writeFileSync(join(target, 'replacement.json'), json(record), { flag: 'wx', mode: 0o600 });
  return { base, record };
}

// ---------------------------------------------------------------- --report

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

const fmt = value => (value === null || value === undefined ? '–' : String(value));

export async function report(options, context = {}) {
  const { destination, freeze } = existingOutput(options.out);
  return startUp(destination, freeze, 'report', context.log ?? console.log, () => reportLocked(destination, freeze, context));
}

function reportLocked(destination, freeze, { root = repo, log = console.log } = {}) {
  const changed = changedFrozenFiles(freeze, root);
  const order = freeze.screens.map(screen => screen.id);
  const armIds = Object.keys(freeze.arms);
  const entries = {};
  const summaries = {};
  const replacements = {};
  const pending = {};
  for (const arm of armIds) {
    entries[arm] = Array.from({ length: freeze.runs }, (_, i) => loadRun(join(destination, arm, `run-${i + 1}`), { screenOrder: order }));
    const at = viewport => summarizeArm(entries[arm].map(entry => ({ run: entry.run, valid: entry.valid, invalidKind: entry.invalidKind, reasons: entry.reasons, primary: entry.viewports[viewport]?.primary ?? null })));
    summaries[arm] = { '1440': at('1440'), '390': at('390') };
    replacements[arm] = replacementsFor(destination, arm);
    pending[arm] = pendingFor(destination, arm, freeze.runs, { sessions: order.length });
  }
  const pairs = [];
  for (const x of armIds) for (const y of armIds) {
    if (x === y) continue;
    const a = summaries[x]['1440'], b = summaries[y]['1440'];
    const open = pending[x].pending || pending[y].pending;
    pairs.push({
      x, y, medianX: open ? null : a.median, medianY: open ? null : b.median,
      gap: !open && a.median !== null && b.median !== null ? b.median - a.median : null,
      maxRange: !open && a.range !== null && b.range !== null ? Math.max(a.range, b.range) : null,
      separates: open ? null : separates(a, b), pending: open,
    });
  }
  const pair = (x, y) => pairs.find(item => item.x === x && item.y === y) || null;
  const killRule = freeze.round !== 're-measure' ? { evaluated: false, note: 'The kill rule applies at re-measure only.' } : {
    evaluated: true,
    styleseedSeparatesFromBare: pair('styleseed', 'bare')?.separates ?? null,
    styleseedSeparatesFromHallmarkLock: pair('styleseed', 'hallmark-lock')?.separates ?? null,
  };
  if (killRule.evaluated) {
    killRule.actions = [];
    if (pair('styleseed', 'bare')?.pending || pair('styleseed', 'hallmark-lock')?.pending) killRule.actions.push('pending: resolve the open infrastructure failures before applying the kill rule.');
    else {
      if (killRule.styleseedSeparatesFromBare !== true) killRule.actions.push('styleseed does not separate from bare: remove or reword the README sentence that claims strength on many screens to what was measured, and re-open the north-star metric.');
      if (killRule.styleseedSeparatesFromHallmarkLock !== true) killRule.actions.push('styleseed does not separate from hallmark-lock: the comparison table says so.');
    }
  }
  const isolationOf = arm => {
    const ran = entries[arm].filter(entry => entry.isolation);
    const none = ran.filter(entry => entry.isolation === 'none').map(entry => entry.run);
    return !ran.length ? '–' : none.length ? `none: ${none.join(', ')}` : 'isolated';
  };

  const blindDir = join(destination, 'blind');
  const keyPath = join(destination, 'blind-key.json');
  let blind;
  if (existsSync(blindDir) || existsSync(keyPath)) {
    blind = { created: false, note: 'blind/ or blind-key.json already exists and was not regenerated; delete both to rebuild the set.' };
  } else {
    mkdirSync(blindDir, { mode: 0o700 });
    const key = {};
    const missing = [];
    const valid = shuffle(armIds.flatMap(arm => entries[arm].filter(entry => entry.valid)));
    for (const entry of valid) {
      let label;
      do { label = `set-${shortId()}`; } while (key[label]);
      key[label] = { arm: entry.arm, run: entry.run };
      for (const viewport of VIEWPORTS) {
        freeze.screens.forEach(screen => {
          const source = join(destination, entry.arm, `run-${entry.runIndex}`, 'screens', viewport.id, `${screen.id}.png`);
          if (!existsSync(source)) { missing.push(`${entry.run} ${viewport.id} ${screen.id}`); return; }
          const target = join(blindDir, label, viewport.id, `${screen.order}-${screen.id}.png`);
          mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
          copyFileSync(source, target);
        });
      }
    }
    writeFileSync(keyPath, json({ note: 'Operator only. Do not share with reviewers.', sets: key }), { flag: 'wx', mode: 0o600 });
    blind = { created: true, sets: Object.keys(key).length, missingScreenshots: missing };
  }

  const browserCache = freeze.isolation?.browserCache ?? null;
  const authMarker = existsSync(join(destination, AUTH_MARKER)) ? AUTH_MARKER : null;
  const reportJson = {
    tool: 's1-drift-runner', round: freeze.round, generatedAt: new Date().toISOString(),
    freeze: { commit: freeze.repository.commit, dirty: freeze.repository.dirty, model: freeze.codex.model, effort: freeze.codex.effort, codexVersion: freeze.codex.version, runs: freeze.runs, isolation: freeze.isolation?.mode ?? null, browserCache },
    protocolChangedSincePrepare: changed, authMarker,
    arms: Object.fromEntries(armIds.map(arm => [arm, { pending: pending[arm], summary: summaries[arm], isolation: isolationOf(arm), replacements: replacements[arm], runs: entries[arm] }])),
    pairs, killRule, blind,
  };
  writeFileSync(join(destination, 'report.json'), json(reportJson), { mode: 0o600 });

  const lines = [];
  lines.push(`# S1 fifth-screen drift: ${freeze.round} report`, '');
  lines.push(`Generated by \`scripts/run-s1-drift.mjs --report\`. Freeze: repository ${freeze.repository.commit}${freeze.repository.dirty ? ' (dirty)' : ''}, Codex ${freeze.codex.version}, model ${freeze.codex.model}, effort ${freeze.codex.effort}, ${freeze.runs} run(s) per arm, prepared isolation: ${freeze.isolation?.mode ?? 'unknown'}.`, '');
  if (freeze.isolation?.mode === 'isolated') {
    lines.push(browserCache?.path
      ? `Browser cache available to the sessions: ${browserCache.path} (${browserCache.source}).`
      : 'No Playwright browser cache was available to the sessions: skills that render a page could not find a browser.', '');
  }
  if (authMarker) lines.push(`**${AUTH_MARKER} is present**: Codex replaced the auth link; --run, --replace and --preflight refuse until it is resolved.`, '');
  lines.push('`home/` is working state and is never published.', '');
  lines.push(freeze.round === 'baseline'
    ? 'Baseline round: unpublished by maintainer decision.'
    : 'Re-measure round: publish with the raw dumps, the failed runs, and the spread. No claim beyond "on this task, with this model, N runs".');
  lines.push('These are measurements against screen 1, not a design judgment and not an expert review. Fewer distinct values is not better design; the functional floor and a separate designer review exist for that reason.', '');
  if (changed.length) lines.push(`**Pre-registered files changed since --prepare:** ${changed.join(', ')}.`, '');
  lines.push('## Primary endpoint at 1440 per arm', '', '| arm | status | valid runs | median | range | min–max | invalid (agent) | invalid (infrastructure) | not run | replaced | isolation | invalid runs |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const arm of armIds) {
    const s = summaries[arm]['1440'];
    const open = pending[arm].pending;
    const status = open ? 'pending' : s.sufficient ? 'summary' : 'no summary (fewer than 3 valid runs)';
    lines.push(`| ${arm} | ${status} | ${s.validRuns} | ${open ? '–' : fmt(s.median)} | ${open ? '–' : fmt(s.range)} | ${open ? '–' : `${fmt(s.min)}–${fmt(s.max)}`} | ${s.invalidAgent} | ${s.invalidInfrastructure} | ${s.notRun} | ${replacements[arm].length} of ${MAX_REPLACEMENTS} | ${isolationOf(arm)} | ${s.invalid.map(item => `${item.run} [${item.kind ?? 'unclassified'}]: ${item.reasons.join('; ')}`).join('<br>') || 'none'} |`);
  }
  const openLines = armIds.filter(arm => pending[arm].pending).flatMap(arm => pending[arm].open.map(item => `- ${item.run} (${item.action}): \`${item.command}\``));
  if (openLines.length) {
    lines.push('', '## Pending', '', 'Replacement is not discretionary: every infrastructure-invalid run is resolved, in run-index order, before an arm gets a summary. Run:', '', ...openLines);
  }
  lines.push('', '## Decision rule as pre-registered', '');
  lines.push('"Arm X separates from arm Y" iff `median(X) < median(Y)` and `median(Y) − median(X) > max(range(X), range(Y))`. An arm with fewer than three valid runs after replacements gets no summary and separates from nothing; a pending arm gets no verdict.', '');
  lines.push('| X | Y | median X | median Y | gap | larger range | X separates from Y |', '|---|---|---|---|---|---|---|');
  for (const item of pairs) lines.push(`| ${item.x} | ${item.y} | ${fmt(item.medianX)} | ${fmt(item.medianY)} | ${fmt(item.gap)} | ${fmt(item.maxRange)} | ${item.pending ? 'pending' : item.separates ? 'yes' : 'no'} |`);
  lines.push('', '## Kill rule', '');
  if (!killRule.evaluated) lines.push(killRule.note);
  else lines.push(...(killRule.actions.length ? killRule.actions.map(action => `- ${action}`) : ['- Neither kill condition is met.']));
  lines.push('', '## Replacements and remeasures (top-up rule)', '');
  const replaced = armIds.flatMap(arm => replacements[arm].map(item => `- ${item.folder}: replacement ${item.replacement ?? '?'} of ${MAX_REPLACEMENTS}, ${item.invalidKind ?? 'unknown'}: ${(item.reasons || []).join('; ')}`));
  const remeasured = armIds.flatMap(arm => entries[arm].filter(entry => entry.remeasured).map(entry => `- ${entry.run}: remeasured ${entry.remeasured} of at most ${MAX_REMEASURES}`));
  lines.push(...(replaced.length || remeasured.length ? [...replaced, ...remeasured] : ['- none']), '');
  lines.push('## Per-run values', '');
  for (const arm of armIds) lines.push(renderArmTable(arm, entries[arm]), '', renderArmTable(arm, entries[arm], { viewport: '390' }), '');
  const notes = armIds.flatMap(arm => entries[arm].flatMap(entry => Object.entries(entry.viewports).flatMap(([viewport, metric]) => (metric?.notes ?? []).map(note => `- ${entry.run} at ${viewport}: ${note}`))));
  lines.push('## Baseline notes', '', ...(notes.length ? notes : ['- none']), '');
  lines.push('## Blind review set', '');
  lines.push(blind.created
    ? `blind/ holds ${blind.sets} valid five-screen set(s) under random labels. The key is blind-key.json next to it: keep it with the operator and do not send it with blind/.${blind.missingScreenshots.length ? ` Missing screenshots: ${blind.missingScreenshots.join(', ')}.` : ''}`
    : blind.note);
  lines.push('');
  writeFileSync(join(destination, 'REPORT.md'), lines.join('\n'), { mode: 0o600 });
  log(`Report written to ${join(destination, 'REPORT.md')}`);
  return reportJson;
}

// ---------------------------------------------------------------- CLI

const HELP = `Usage: node scripts/run-s1-drift.mjs [--plan | --prepare | --preflight | --run | --remeasure | --replace | --report] [options]

  --plan (default)   Print the exact steps and commands for every arm and run. Writes nothing.
                     Options: --round baseline|re-measure --arms a,b --runs 3 --model <id> --effort high --timeout-minutes 40
  --prepare          --out <new folder outside this checkout> plus the --plan options, and --codex-auth <file>,
                     --skill-dir <arm>=<dir> (a saved copy of a pinned skill tree), --allow-dirty,
                     --no-isolated-home (only with --allow-global-skills)
  --preflight        --out <dir>: one trivial codex exec in the isolated home; checks the model, effort and auth link
  --run              --out <dir> --arm <id> --run-index <n> [--node-modules <dir>] [--browser <playwright module>]
                     [--no-isolated-home --allow-global-skills]
  --remeasure        --out <dir> --arm <id> --run-index <n> [--browser <module>]: rerun the floor and measurement of a
                     run whose sessions finished and whose floor failed for an infrastructure reason (at most ${MAX_REMEASURES})
  --replace          --out <dir> --arm <id> --run-index <n>: replace an infrastructure-invalid run (at most ${MAX_REPLACEMENTS} per arm, in run-index order)
  --report           --out <dir>

Protocol: ${DRIFT_DIR}/PROTOCOL.md. Metric: scripts/s1-drift-metric.mjs.`;

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) { console.log(HELP); return; }
  if (options.mode === 'plan') { process.stdout.write(buildPlan(options)); return; }
  if (options.mode === 'prepare') {
    const { destination, freeze } = await prepare(options);
    console.log(`Prepared ${Object.keys(freeze.arms).length} arm(s) × ${freeze.runs} run(s) in ${destination} (isolation: ${freeze.isolation.mode}). Next: node scripts/run-s1-drift.mjs --preflight --out ${destination}`);
    return;
  }
  if (options.mode === 'preflight') {
    const record = await preflight(options);
    console.log(`Preflight ${record.passed ? 'passed' : 'FAILED'}: model ${record.observed.model ?? 'not found'} (expected ${record.expected.model}), effort ${record.observed.effort ?? 'not found'} (expected ${record.expected.effort}), reply ${JSON.stringify(record.reply)}. Record: ${record.home}/preflight.json${record.authMarker ? `\n${readFileSync(record.authMarker, 'utf8')}` : ''}`);
    if (!record.passed) process.exitCode = 2;
    return;
  }
  if (options.mode === 'run' || options.mode === 'remeasure') {
    const { base, record } = options.mode === 'run' ? await runOne(options) : await remeasure(options);
    console.log(`${record.valid ? 'Valid' : `Invalid (${record.invalidKind})`} run written to ${join(base, 'run.json')}${record.remeasured ? ` (remeasure ${record.remeasured})` : ''}${record.reasons.length ? `:\n  ${record.reasons.join('\n  ')}` : ''}`);
    if (!record.valid) process.exitCode = 2;
    return;
  }
  if (options.mode === 'replace') {
    const { base, record } = await replaceRun(options);
    console.log(`Replacement ${record.replacement} of ${record.of} for ${options.arm}: the invalid run moved to ${record.from}; ${base} starts fresh. Next: --run --out ${options.out} --arm ${options.arm} --run-index ${options.runIndex}`);
    return;
  }
  await report(options);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { await main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
