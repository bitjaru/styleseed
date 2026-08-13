import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..', '..')
const fixtureEntries = [
  '.claude-plugin',
  '.codex-plugin',
  'LICENSE',
  'SECURITY.md',
  'engine',
  'scripts/build-context-catalog.mjs',
  'demo-pricing/README.md',
  'demo-pricing/AGENTS.md',
  'demo-pricing/CLAUDE.md',
  'demo-pricing/app',
  'demo-pricing/content',
  'demo-pricing/public',
  'demo-pricing/scripts',
  'skins',
]
const generatedTargets = [
  'demo-pricing/.engine',
  'demo-pricing/app/skins.css',
  'demo-pricing/public',
  'skills',
]

function copyFixture(destinationRoot) {
  for (const entry of fixtureEntries) {
    cpSync(resolve(repoRoot, entry), resolve(destinationRoot, entry), { recursive: true })
  }
}

function runGenerator(destinationRoot, sourceDateEpoch = null) {
  const env = { ...process.env }
  delete env.SOURCE_DATE_EPOCH
  if (sourceDateEpoch !== null) env.SOURCE_DATE_EPOCH = sourceDateEpoch

  const run = spawnSync(process.execPath, ['demo-pricing/scripts/build-llms.mjs'], {
    cwd: destinationRoot,
    encoding: 'utf8',
    env,
  })
  assert.equal(
    run.status,
    0,
    `generator failed with exit ${run.status}\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`,
  )
}

function collectInventory(basePath, prefix = '') {
  const stats = statSync(basePath)
  if (stats.isFile()) {
    const content = readFileSync(basePath)
    return [{
      path: prefix,
      bytes: stats.size,
      sha256: createHash('sha256').update(content).digest('hex'),
    }]
  }

  return readdirSync(basePath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const nextPath = join(basePath, entry.name)
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) return collectInventory(nextPath, nextPrefix)
      return collectInventory(nextPath, nextPrefix)
    })
}

function snapshotGeneratedOutputs(destinationRoot) {
  return generatedTargets.flatMap((target) =>
    collectInventory(resolve(destinationRoot, target), relative(destinationRoot, resolve(destinationRoot, target))),
  )
}

test('generated outputs are byte-identical across isolated runs with unchanged inputs', () => {
  const sandboxRoot = mkdtempSync(join(tmpdir(), 'styleseed-repro-'))
  const firstRunRoot = join(sandboxRoot, 'run-a')
  const secondRunRoot = join(sandboxRoot, 'run-b')

  try {
    copyFixture(firstRunRoot)
    copyFixture(secondRunRoot)

    runGenerator(firstRunRoot)
    runGenerator(firstRunRoot)
    runGenerator(secondRunRoot)

    const firstInventory = snapshotGeneratedOutputs(firstRunRoot)
    const secondInventory = snapshotGeneratedOutputs(secondRunRoot)

    assert.deepEqual(firstInventory, secondInventory)
    assert.doesNotMatch(readFileSync(resolve(firstRunRoot, 'demo-pricing/public/llms-full.txt'), 'utf8'), /^Generated:/m)
    assert.equal(
      Object.hasOwn(
        JSON.parse(readFileSync(resolve(firstRunRoot, 'demo-pricing/public/.well-known/styleseed/registry.json'), 'utf8')),
        'generated',
      ),
      false,
    )
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true })
  }
})

test('SOURCE_DATE_EPOCH adds stable timestamp metadata when explicitly requested', () => {
  const sandboxRoot = mkdtempSync(join(tmpdir(), 'styleseed-source-date-'))
  const fixtureRoot = join(sandboxRoot, 'fixture')

  try {
    copyFixture(fixtureRoot)
    runGenerator(fixtureRoot, '0')

    const expectedTimestamp = '1970-01-01T00:00:00.000Z'
    assert.match(
      readFileSync(resolve(fixtureRoot, 'demo-pricing/public/llms-full.txt'), 'utf8'),
      new RegExp(`^Generated: ${expectedTimestamp}$`, 'm'),
    )
    assert.equal(
      JSON.parse(readFileSync(resolve(fixtureRoot, 'demo-pricing/public/.well-known/styleseed/registry.json'), 'utf8')).generated,
      expectedTimestamp,
    )
    assert.match(
      readFileSync(resolve(fixtureRoot, 'demo-pricing/app/skins.css'), 'utf8'),
      new RegExp(`^/\\* Generated: ${expectedTimestamp.replaceAll('.', '\\.')} \\*/$`, 'm'),
    )
  } finally {
    rmSync(sandboxRoot, { recursive: true, force: true })
  }
})
