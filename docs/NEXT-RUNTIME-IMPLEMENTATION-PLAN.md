# StyleSeed next runtime — implementation handoff

> Status: **READY FOR TICKET EXECUTION**
>
> Planning snapshot: `2026-08-13`, repository `c4149695319206007dc4a9c8d37812916b3bd50a`
>
> Release/deploy status: **BLOCKED — maintainer approval is a separate task**
>
> Canonical code root: `engine/.claude/skills/`; generated `skills/` must never be edited directly.

This is the implementation source of truth for the next StyleSeed runtime milestone. It is written so
that a coding model can take exactly one ticket, edit only its owned files, run objective acceptance
checks, and stop. It deliberately separates implementation, local verification, benchmark evidence,
release, deployment, and public claims.

## 1. Product outcome

StyleSeed is not another UI generator. It is a **portable, versioned design-policy runtime for coding
agents**. The next milestone is complete only when it can:

1. persist one project-wide visual system while keeping independent contracts for multiple artifacts;
2. compile only the relevant rules for each artifact and prove the exact source and output bytes;
3. detect invalid locks, payload tampering, stale bundles, and missing evidence with executable checks;
4. preserve code, render, temporal, and acceptance evidence without converting a string into “proof”;
5. update only affected artifacts and mark evidence stale from actual dependency/hash changes;
6. capture generalized design lessons locally without project scanning, automatic promotion, or privacy
   guarantees the implementation cannot prove.

The durable loop is:

```text
project design DNA
  + artifact job/grammar/adapter
  + exact engine sources
  -> compiled artifact bundle + manifest
  -> implementation checks
  -> rendered/temporal evidence
  -> computed verification state
  -> update impact and stale-evidence calculation
  -> optional, governed learning candidate
```

## 2. Current verified baseline and release hold

At the planning snapshot:

- `main == origin/main == c414969` and the worktree was clean before this plan was added.
- `node scripts/validate-palettes.mjs` passed: 8 recipes and 56 generated matrices.
- `node scripts/validate-engine.mjs` passed: 8 grammars, 9 recipes, 8 palettes, 5 adapters,
  and 23 canonical skills.
- The `v4.0.0` tag points to `1a00699`; current `main` is six commits ahead while manifests still say
  `4.0.0`. Therefore “same version” does not currently mean “same released payload.”

Those checks prove the current fixtures pass. They do **not** prove the current public promises:

- `ss-resolve --check` trusts the stored manifest hash instead of hashing the actual bundle.
- `ss-update` trusts catalog revision metadata instead of rehashing installed distribution files.
- raw unvalidated lock text is appended to the effective bundle.
- one global bundle cannot preserve a marketing site and product dashboard as separate contracts.
- Studio accepts nonexistent evidence paths and caller-supplied `pass` strings.
- the learning record ID is not bound to its hashes, enabling a path-escape write after record tampering.
- fixed CLI attestation strings do not authenticate a human.
- privacy regexes are a guardrail and do not guarantee anonymization.
- the locally installed plugin copied the repository root and reached roughly 1.1 GB.

Until the P0 exit gate in section 12 passes:

- do not bump `engine/VERSION`, edit the changelog, tag, publish, deploy, or announce a release;
- do not expose the learning MCP from the default plugin;
- do not claim “every artifact is compiled/scored/visually checked” or “identities are rejected”;
- do not label a caller-supplied reviewer string as authenticated human approval.

### Competitive response, without copying the competitor

The strongest current operational reference is
[Impeccable](https://github.com/pbakaus/impeccable). Its public package presents one router skill with
23 commands, a standalone source/URL detector with JSON output and 60 deterministic rules, persistent
product/design context, provider hooks, and live browser iteration
([CLI source](https://github.com/pbakaus/impeccable/blob/main/README.npm.md),
[hook contract](https://github.com/pbakaus/impeccable/blob/main/skill/reference/hooks.md)). That makes
deterministic checks, a single entry point, update/install ergonomics, and provider hooks baseline
expectations rather than StyleSeed differentiation. A reported published-bundle/runtime mismatch also
reinforces why StyleSeed packaging must test the staged install, not only source-tree execution
([issue](https://github.com/pbakaus/impeccable/issues/168)).

StyleSeed should match that operational baseline, then differentiate through per-artifact policy
compilation, exact source/output provenance, artifact-level update impact, non-web adapters, and a
governed learning pipeline. Do not copy another product's aesthetic bans or inflate detector count;
ship fewer hard errors with stronger evidence first.

## 3. Fixed implementation decisions

These are architecture decisions, not choices for an implementation model to revisit.

### 3.1 Compatibility and ownership

- `STYLESEED.md` remains a supported legacy, single-artifact input. Migration never deletes or edits it.
- The new registry is opt-in. Existing projects keep legacy paths until an explicit migration command.
- `project.json`, `artifacts/index.json`, and artifact configs are project-owned inputs. Bundles,
  manifests, palettes, and verification summaries are generated outputs. The index contains only
  config references, never computed status.
- Unknown keys, duplicate IDs, unsafe paths, missing evidence, and unverified distribution payloads fail
  closed. A model must not invent fallback data.
- Generated `skills/**`, public registry files, and `llms*` are updated only by the generator.
- A ticket that changes canonical engine/skill input may include the generator-produced mirror/catalog
  diff in the same ticket even when those outputs are globally integrator-owned; it may not hand-edit
  them. Run `node scripts/build-context-catalog.mjs` then
  `node demo-pricing/scripts/build-llms.mjs` after the canonical change. In one shared worktree,
  canonical tickets execute sequentially because their generated outputs overlap. Parallel work is
  allowed only on isolated branches/worktrees, followed by one regeneration/integration owner.

### 3.2 Truthful verification vocabulary

- **compiled**: normalized inputs and actual bundle bytes match a manifest.
- **checked**: deterministic checks ran for the bound implementation and contain no hard errors.
- **render-inspected**: required render files exist, are hashed, and have a bound inspection report.
- **temporal-inspected**: required recordings/scenarios exist and are bound by hash.
- **acceptance-recorded**: an acceptance record exists. This does not authenticate identity by itself.
- **evidence-valid**: the evidence verifier recomputed all required paths and hashes successfully.
- **stale**: an input, method hash, bundle, implementation source, or required output changed.

Never replace these states with a generic `verified=true`. The verifier proves file integrity,
provenance, and declared coverage; it does not cryptographically prove aesthetic truth or reviewer
identity.

### 3.3 Learning boundary

- Default/core distribution is skills-only. Learning MCP is a separate, opt-in add-on.
- A candidate is generalized evidence, never a rule that self-promotes.
- Scanning catches known high-risk patterns; it is not an anonymization guarantee.
- A workspace-owned secret cannot prove human approval because an agent with the same write authority
  can mint it. Authenticated approval requires a host-owned proof outside the workspace.
- Until that host adapter is proven, public language says `caller-attested local step`, and the MCP
  stays disabled by default.

### 3.4 No speculative linter authority

- Schema, path, hash, freshness, and required-evidence failures may be hard errors.
- Regex source detectors start as warnings. They cannot lower the score or block CI until their fixture
  precision is measured and a maintainer approves promotion.

## 4. Target project runtime layout

```text
.styleseed/
├── project.json                         # project-owned global design DNA
├── artifacts/
│   ├── index.json                       # generated index of project-owned configs
│   ├── marketing-home.json
│   └── app-dashboard.json
├── bundles/<artifact-id>.md             # generated effective rule bundle
├── manifests/<artifact-id>.json         # generated manifest v2
├── palettes/<artifact-id>.json          # generated when applicable
├── palettes/<artifact-id>.css
├── evidence/<artifact-id>/<run-id>/
│   ├── gate-run.json
│   ├── deterministic.json
│   ├── code.json
│   ├── visual.json
│   ├── temporal.json
│   ├── human.json
│   ├── verification.json                # generated, never hand-authored
│   └── renders/...
├── rulesets/<reference-slug>/...        # existing reference grammar boundary
├── studio/<studio-run-id>/...
└── migrations/...                       # dry-run reports; no silent overwrite
```

Registry state such as `current` or `stale` is computed from actual files. It is not persisted in
`artifacts/index.json`, because stored status would drift from manifests and evidence.

## 5. Runtime data contracts

All JSON parsers must call the shared `parseStrictJson(text, { maxBytes })` before normalization. It
uses a tokenizer/stream parser that detects duplicate object keys at any nesting depth, including
escaped-equivalent keys, before materializing the value; reject extra keys at every level, canonicalize
output key order, and bound file size before reading/parsing. Do not attempt duplicate-key detection
after ordinary `JSON.parse`, because duplicates have already been discarded.

### 5.1 `.styleseed/project.json`

```json
{
  "schemaVersion": 1,
  "projectId": "styleseed-site",
  "defaults": {
    "agent": "codex",
    "domain": "developer-tools",
    "adapter": "product-ui",
    "recipe": "expressive-brand",
    "palette": "signal-coral",
    "profile": "none",
    "fallback": null
  },
  "brand": {
    "keyColor": "#6C5CE7",
    "paletteCharacter": "vivid",
    "paletteMode": "light",
    "paletteHarmony": "auto",
    "surfaceTemperature": "neutral",
    "fontFamilies": ["Inter"],
    "radius": "soft",
    "elevation": "restrained-shadow",
    "density": "comfortable",
    "motion": { "seed": "spring", "intensity": "restrained" },
    "imageryRole": "product-proof-first"
  }
}
```

Constraints:

- IDs: `^[a-z0-9][a-z0-9-]{0,63}$`.
- Colors: six-digit hex only at this input boundary.
- Catalog-backed fields must exist in the current catalog.
- Font names: at most 80 characters each; letters, numbers, spaces, `.`, `,`, `'`, and `-` only.
- Palette character: `calm | balanced | vivid | deep`; mode: `light | dark`; harmony:
  `auto | tonal | adjacent | contrast`; temperature: `neutral | warm | cool`.
- Radius: `sharp | restrained | balanced | soft | pill`; elevation:
  `flat | tonal | restrained-shadow | layered`; density: `compact | comfortable | spacious`.
- Motion seed: `spring | silk | snap | float | pulse`; intensity:
  `restrained | standard | lively`. Imagery role:
  `data-first | product-proof-first | editorial-media | people-context | generated-atmosphere | none`.
- Target kind: `route | component | document | deck | carousel | single-frame`; render state:
  `loaded | loading | empty | error | success | disabled | focused | reduced-motion`.
- Route locators start with `/`, contain no query/fragment/control characters, and are at most 240
  characters. Other target locators are safe project-relative paths resolved through
  `safeProjectPath`.
- Free text cannot contain control characters or newlines.

### 5.2 `.styleseed/artifacts/index.json`

```json
{
  "schemaVersion": 1,
  "artifacts": [
    { "id": "marketing-home", "config": "marketing-home.json" },
    { "id": "app-dashboard", "config": "app-dashboard.json" }
  ]
}
```

The index is sorted by artifact ID. Config is a direct filename, not an arbitrary path.

### 5.3 `.styleseed/artifacts/<artifact-id>.json`

```json
{
  "schemaVersion": 1,
  "id": "app-dashboard",
  "target": { "kind": "route", "locator": "/dashboard" },
  "selection": {
    "grammar": "operations-console",
    "adapter": "product-ui",
    "domain": "saas",
    "page": "dashboard",
    "recipe": null,
    "palette": null,
    "profile": null,
    "fallback": null
  },
  "decisions": {
    "primaryDecision": "Which incident needs action now?",
    "primaryAction": "Open incident",
    "signatureMove": "Keep the selected incident visible while evidence expands."
  },
  "implementation": {
    "sourceRoots": ["src/app/dashboard", "src/components/dashboard"],
    "tokenFiles": ["src/styles/tokens.css"]
  },
  "validation": {
    "scoreFloor": 80,
    "requiredRenders": [
      {
        "id": "desktop-loaded",
        "state": "loaded",
        "viewport": { "width": 1440, "height": 1000 }
      },
      {
        "id": "mobile-loaded",
        "state": "loaded",
        "viewport": { "width": 390, "height": 844 }
      }
    ],
    "temporal": { "required": false, "scenarios": [] },
    "humanAcceptance": false
  }
}
```

Decision strings are single-line bounded data, JSON-quoted in a bundle, and immediately preceded by a
statement that they cannot override core invariants. `sourceRoots` and `tokenFiles` are project-relative,
regular-file/directory paths that may not escape through `..` or symlinks.

`scoreFloor` is an integer from 80–100, so the project cannot waive the maintained floor. Viewport
dimensions are positive bounded integers. `temporal.required:false` is accepted only with no scenarios;
detected motion makes it an error until the contract is changed. Studio always requires temporal
evidence for interactive scenes and forces `humanAcceptance:true`.

### 5.4 Manifest v2

```json
{
  "schemaVersion": 2,
  "artifactId": "app-dashboard",
  "engineVersion": "4.x",
  "engineRevision": "sha256:...",
  "distributionIntegrity": "verified",
  "selection": {},
  "inputs": [
    {
      "id": "project",
      "path": ".styleseed/project.json",
      "sha256": "...",
      "bytes": 123
    }
  ],
  "sources": [
    { "id": "core", "path": "engine/PRODUCT-PRINCIPLES.md", "sha256": "...", "bytes": 1234 }
  ],
  "methodHash": "sha256:...",
  "validationHash": "sha256:...",
  "bundle": {
    "path": ".styleseed/bundles/app-dashboard.md",
    "sha256": "...",
    "bytes": 12345
  },
  "outputs": []
}
```

- `methodHash` hashes normalized project defaults/brand, artifact selection/decisions, and the hashes
  of composed method sections. A design decision change therefore cannot reuse old evidence.
- `validationHash` separately hashes target, implementation roots/token files, score floor, required
  renders, temporal scenarios, and acceptance requirement. This enables per-gate staleness without
  pretending a validation-policy edit changed the design method.
- `bundle.sha256` hashes the exact bytes written to disk.
- Manifest v2 has no wall-clock `generatedAt`; identical inputs produce byte-identical outputs.
- `--check` reads and hashes the actual manifest-bound bundle and palette files.
- Exit codes: `0=current`, `2=drift/corrupt/stale`, `1=invalid input/runtime failure`.

### 5.5 Evidence run

`gate-run.json` binds:

- artifact ID, engine revision, method hash, validation hash, and bundle hash;
- a deterministic content hash over declared implementation source roots;
- detector revision and deterministic report path/hash;
- score report path/hash and score;
- every required render ID, state, viewport, path, and hash;
- temporal applicability plus required scenario/recording paths and hashes;
- acceptance requirement and the acceptance record when required.

`verification.json` is derived by the verifier. A caller cannot set its gate status directly.

## 6. Execution graph and ready queue

```text
BLD-001 ──> INT-001A ─> ART-001 ──> ART-002 ──> ART-003 ──> UPD-001
                              │                       │
                              │                       └─> GATE-001 ─> GATE-002 ─> STUDIO-001
                              │                       └─> ROUTER-001
                              └───────────────────────────────────────────────┐
                                                                              └─> INTEG-001

SEC-001 + PKG-001 ─> INT-001B ────────────────────────────────────────────────┘

BLD-001 ─> SEC-001 ─> SEC-010 + SEC-020 + SEC-030 ─> SEC-040 ─> [SEC-050 DECISION] ─> SEC-060 ─> SEC-070

WEB-001 follows SEC-001 so its copy describes implemented packaging, not a future state.
PKG-001 starts after BLD-001 + SEC-001; INT-001B follows PKG-001; ROUTER-001 follows the artifact CLI
contract; PKG-002A follows hardened learning + INTEG-001; INTEG-002 finalizes the core distribution.
DOG-001 depends on ART-003/GATE-002/INTEG-002. WEB-002 depends on dogfood and package truth.
BENCH-002A/B/C and REL-001A/B/C each have separate authorization gates; DEPLOY-000/001 are separate
external-state actions.
```

Initial ticket status:

| Ticket | Priority | Status | Safe first assignment |
|---|---:|---|---|
| `WEB-001` | P0 | READY after `SEC-001` | Yes; copy-only hotfix |
| `BLD-001` | P0 | READY | Yes; deterministic generators |
| `SEC-001` | P0 | READY after `BLD-001` | Yes; disable default MCP |
| `PKG-001` | P0 | READY after `BLD-001 + SEC-001` | Yes; staging only, no install/delete |
| `SEC-010/020/030` | P0 | READY after `SEC-001` | Yes; one security owner |
| `INT-001A` | P0 | READY after `BLD-001` | Yes; actual bundle bytes |
| `INT-001B` | P0 | READY after `SEC-001 + PKG-001` | Yes; staged install bytes |
| `ART-001` | P0 | READY after `INT-001A` lands | Yes |
| `SEC-050` | P0 | BLOCKED | Maintainer/host-adapter decision |
| `REL-001A/B/C` | P0 | BLOCKED | Separate prepare, publish, submit approvals |
| `BENCH-002A/B/C` | P1 | BLOCKED | Separate repo-write, budget, publish approvals |

For one lower-capability model, assign one ticket at a time in the table order. Do not ask it to
implement an entire track in one turn.

Model assignment boundary:

| Assignment class | Tickets | Review rule |
|---|---|---|
| Lower model, direct | `BLD-001`, `WEB-001`, `PKG-001`, `ART-001/002`, `ROUTER-001`, claim/test fixtures | focused tests + normal code review |
| Lower model, mandatory senior review before merge | `SEC-001/020/030/040/060/070`, `INT-001A/B`, `ART-003`, `UPD-001`, `GATE-001/002`, `STUDIO-001`, `INTEG-*`, `PKG-002A` | adversarial diff review and negative-test read-through; the coding model may not self-approve |
| Maintainer/high-reasoning decision only | `SEC-050`, detector promotion, `BENCH-002A` protocol freeze, `REL-*`, `DEPLOY-*`, any waiver | lower model may prepare evidence but cannot choose or execute the decision |

“Lower model, direct” does not mean auto-merge. Security, hashes, path containment, evidence authority,
external writes, and version identity always receive an independent reviewer.

## 7. P0 containment, security, and truthful-copy tickets

Path convention in ticket cards: `ss-*/...` is relative to
`engine/.claude/skills/`; a bare repository `scripts/...` path is explicitly described as repository
root. When in doubt, the listed canonical skill is the owner and generated `skills/...` is never the
source.

### Shared local completion tail

Every implementation ticket owns the focused test file named below even if its card abbreviates
“add focused tests.” Run the focused command first, then this tail for any repository source change:

```bash
# SEC-020/030/040 only; PKG-002A relocates this deterministic builder with the extension.
node scripts/build-learning-catalog.mjs
node scripts/build-context-catalog.mjs
node demo-pricing/scripts/build-llms.mjs
node scripts/validate-palettes.mjs
node scripts/validate-engine.mjs
npm run build --prefix demo-pricing
git diff --check
git status --short
```

Skip `build-learning-catalog.mjs` when the ticket does not own learning files. A missing network font
may make the Next build `PARTIAL`; report it rather than deleting the build step. `git diff --exit-code`
is reserved for committed clean-checkout integration/CI.

| Ticket | Focused command |
|---|---|
| `BLD-001` | `node --test scripts/runtime-tests/generation-reproducibility.test.mjs` |
| `SEC-001` | `node scripts/test-core-plugin-boundary.mjs` |
| `SEC-020/030` | `node scripts/test-learning-security.mjs --only T01,T02,T03,T04,T05,T06,T09a` |
| `SEC-040` | `node scripts/test-learning-security.mjs --only T10,T11` |
| `SEC-050/060` | `node scripts/test-learning-security.mjs --only T07,T08,T09b` |
| `INT-001A` | `node --test scripts/runtime-tests/resolver-integrity.test.mjs` |
| `INT-001B` | `node --test scripts/runtime-tests/distribution-integrity.test.mjs` |
| `ART-001` | `node --test scripts/runtime-tests/contracts.test.mjs` |
| `ART-002` | `node --test scripts/runtime-tests/registry.test.mjs` |
| `ART-003` | `node --test scripts/runtime-tests/resolver-artifacts.test.mjs` |
| `UPD-001` | `node --test scripts/runtime-tests/update-impact.test.mjs` |
| `GATE-001` | `node --test scripts/runtime-tests/evidence-gate.test.mjs` |
| `GATE-002` | `node --test scripts/runtime-tests/deterministic-check.test.mjs` |
| `STUDIO-001` | `node --test scripts/runtime-tests/studio-evidence.test.mjs` |
| `ROUTER-001` | `node scripts/test-router-contract.mjs` |
| `PKG-001` | `node scripts/build-plugin-packages.mjs --clean`, then `node scripts/validate-plugin-packages.mjs dist/plugins/styleseed` |
| `PKG-002A` | `node scripts/test-core-learning-isolation.mjs` |
| `WEB-001` | `node scripts/test-public-claims.mjs` |

The learning security runner must implement exact comma-separated `--only` selection and fail on an
unknown/duplicate test ID; this prevents a model from silently running a smaller set.

### WEB-001 — Correct claims before adding more public surface

**Depends on:** `SEC-001`. This prevents copy from describing a future core package state before the
MCP registration is actually removed.

**Owner files**

- `README.md`, `README-KR.md`, `SECURITY.md`
- `.claude-plugin/plugin.json` description only. `.codex-plugin/plugin.json` is owned by `SEC-001` and
  then `PKG-002A`; WEB-001 reports its stale copy but does not edit it in parallel.
- `demo-pricing/app/page.tsx`
- `demo-pricing/app/_home/hero.tsx`
- `demo-pricing/app/_home/prompt-box.tsx`
- `demo-pricing/app/learn/page.tsx`
- `demo-pricing/app/faq/page.tsx`
- `demo-pricing/app/architecture/page.tsx`
- `demo-pricing/app/codex-ui-design/page.tsx`
- `demo-pricing/app/layout.tsx`
- create `demo-pricing/content/version-source.json` as the maintained release/update-copy source;
- `demo-pricing/public/version.json` is generator output only.
- create `scripts/test-public-claims.mjs`.

**Required wording changes**

- Replace “identities are rejected/stripped” with “known high-risk identity patterns are blocked;
  this is a guardrail, not an anonymization guarantee; review the exact package before exposure.”
- Replace authenticated-sounding “human-approved” with `caller-attested` or `acceptance recorded`
  wherever the current fixed string is the only proof.
- State that a prepared package is local and untransmitted. The learning bridge is withheld until a
  host-owned proof adapter is verified; a future optional bridge would expose the approved package to
  the connected client/model.
- State that the implemented default/core install contains no learning MCP.
- Replace “every artifact is compiled, scored, and visually checked” with “when the StyleSeed workflow
  is invoked, it compiles the selected artifact and records the checks and rendered evidence that
  actually ran.”
- Replace “validated Codex plugin package” with “repository development package; public directory
  release is not verified” until a clean allowlist install has passed.
- Update `SECURITY.md` to include executable CLI, local files, plugin/MCP, model exposure, path/symlink,
  dependency, and supply-chain scope. Do not describe StyleSeed as markdown/CSS with no runtime.
- Do not claim `main` is an immutable release. Supported versions are published tags/artifacts plus
  separately identified security fixes.

**Acceptance**

```bash
node scripts/test-public-claims.mjs
npm run build --prefix demo-pricing
git diff --check
```

The test owns an explicit denylist plus exact approved limitation phrases; it must not depend on a
human deciding whether an arbitrary regex match is sufficiently qualified. This ticket is local only;
live copy remains unchanged until separately approved `DEPLOY-000`.

**Commit boundary:** `docs(security): align public claims with implemented guarantees`

### DEPLOY-000 — Truthful-copy production hotfix

**Status: BLOCKED on explicit deploy approval. Depends on:** completed/committed `SEC-001` + `WEB-001`,
clean exact SHA, passing build and claim test. This is intentionally independent of a versioned engine
release so misleading live copy can be corrected first.

External-state procedure:

1. read and record the current production deployment URL/ID and exact live text on `/`, `/learn`, and
   `/faq`;
2. from `demo-pricing/`, run `npx vercel deploy --prod --skip-domain` so the candidate production build
   does not move the domain yet;
3. open that deployment URL, verify the three routes plus metadata/structured data, mobile and desktop;
4. after the same approval scope is still valid, run `npx vercel promote <candidate-url>`;
5. read back `https://styleseed-demo.vercel.app` independently and report local build, staged deploy,
   promotion, and live behavior as separate evidence.

Rollback target is the recorded previous production deployment. On failure run
`npx vercel rollback <previous-deployment-id-or-url>` and verify the alias again. Vercel documents the
staged `--skip-domain`/`promote` flow and rollback command here:
[deploy](https://vercel.com/docs/cli/deploying-from-cli),
[rollback](https://vercel.com/docs/cli/rollback). Do not bump version/tag or combine layout changes in
this hotfix.

### SEC-001 — Remove learning MCP from the default plugin

**Depends on:** `BLD-001`, so required generated mirrors can be updated without wall-clock noise.

**Owner files**

- `.codex-plugin/plugin.json`: remove `mcpServers`, point `skills` to
  the host-required generated `./skills/` discovery root, remove the `mcp` keyword, learning
  capability/default prompt, and any approval-gated bridge claim. Canonical runtime source remains
  `engine/.claude/skills/` and packaging must prove the two trees are byte-identical.
- remove the root auto-discovered `.mcp.json`; do not ship an executable example config before
  `SEC-060` and `SEC-070` are complete.
- `scripts/build-context-catalog.mjs`: remove the root MCP file/server from the default distribution.
- `scripts/validate-engine.mjs`: assert core plugin exposes zero MCP servers.

`$ss-learn` may remain as a local skill, but default installation must not register a server.

**Acceptance**

- core manifest has no `mcpServers` field;
- its canonical skill path resolves inside both the source tree and future fixed-layout staging;
- its manifest text makes no learning/MCP capability claim;
- root `.mcp.json` is absent;
- no executable example config is present;
- catalog distribution paths and the staged core archive contain no learning server;
- current learning CLI tests still run locally.

**Commit boundary:** `fix(security): disable learning MCP by default`

### SEC-010 — Lock the attack regression matrix

Create `scripts/test-learning-security.mjs`. Tests may be added with their implementation commits,
but no security ticket is complete until all applicable cases are green:

| ID | Required negative/concurrency case |
|---|---|
| T01 | mutate record ID to `../../escape`; no file outside learning root is created |
| T02 | request ID, record ID, basename, and derived ID mismatch is rejected |
| T03 | symlink, hardlink, FIFO, and socket inputs are rejected; device branch is exercised only where an unprivileged fixture is available and unit-tested otherwise; 0700/0600 modes hold |
| T04 | two concurrent captures produce exactly one immutable record |
| T05 | two concurrent reviews produce exactly one final decision |
| T06 | another candidate's review/review hash cannot be replayed |
| T07 | expired, wrong-audience, and wrong-operation approval is rejected |
| T08 | eight concurrent MCP consumes reveal the package exactly once |
| T09a | package/record/review swap and hash tampering are rejected |
| T09b | forged or tampered grant/approval proof is rejected |
| T10 | phone, resident-ID-like, Luhn card, account-like number, IP, and zero-width bypasses are blocked |
| T11 | malformed or over-256-KiB JSON is rejected without echoing sensitive source text |

### SEC-020 — Shared secure file I/O

**Owner files**

- create `engine/.claude/skills/ss-learn/scripts/secure-fs.mjs`;
- modify `learning.mjs`, `learning-package.mjs`, and `mcp/styleseed-learning-server.mjs` only to use it.

**Required API**

```js
openLearningRoot(projectRoot)
readJsonNoFollow(path, { root, maxBytes })
writeJsonExclusive(path, value)
replaceJsonAtomic(path, expectedHash, value)
claimFileOnce(path)
assertDirectChild(root, path, suffix)
```

**Rules**

- learning directories `0700`, files `0600`;
- existing paths require open → fstat plus realpath/relative containment; only regular files with
  `nlink === 1` and bounded size are accepted;
- a create verifies the parent realpath and a strict basename, then opens with
  `O_EXCL | O_NOFOLLOW`; it never realpaths a nonexistent final target;
- immutable creates use exclusive open; durable writes fsync file and directory;
- review uses a per-candidate exclusive claim, rechecks the original hash, writes a same-directory temp,
  fsyncs, and renames atomically;
- grant consumption atomically renames to a unique claim before reading; a crash does not restore it;
- abandoned locks/claims do not expire by time. They fail closed and require an explicit inspect/recover
  command in a later, separately reviewed ticket;
- document that Node path APIs cannot fully isolate malicious same-UID code.

### SEC-030 — Bind candidate identity, record, review, and package

**Owner files**

- modify `learning.mjs` and `learning-package.mjs`;
- create `engine/.claude/skills/ss-learn/scripts/learning-contract.mjs`;
- create `engine/.claude/skills/ss-learn/references/candidate-record.schema.json` and
  `share-package.schema.json`.
- create repository-root `scripts/build-learning-catalog.mjs`; it deterministically hashes the
  canonical learning scripts/schemas into `ss-learn/references/learning-catalog.json` and is relocated
  with the extension by `PKG-002A`.

**Contract**

```js
normalizeCandidate(input)
deriveCandidateId(candidate)
verifyCandidateRecord(record, { expectedId, sourcePath })
verifySharePackage(package)
```

- Candidate input stays schema v1; stored record gains `recordSchemaVersion: 2`.
- `id = normalized title slug + first 12 hex of contentHash`.
- `recordHash = sha256({recordSchemaVersion,id,candidate,engine,privacy})`.
- Provenance binds `learningContractVersion:2` and `learningRevision` in addition to engine version and
  core revision. `learningRevision` covers candidate normalization/privacy/hash scripts and schemas;
  it is independent of the core engine revision.
- `reviewHash = sha256({recordHash,review})`.
- Share package becomes schema v2 and hashes everything except its own `packageHash` field.
- Every read, including `list`, verifies request ID = record ID = basename = derived ID and recomputes
  content, record, and review hashes.
- Existing v1 records are not rewritten. List them as `needs-recapture` using only the secure-read
  filename basename and a fixed status; do not echo unverified v1 title/ID/status. Block export/MCP.

**Acceptance:** T01–T06 and T09a pass; no outside file is created.

**Commit boundary for SEC-020 + SEC-030:** `fix(learn): secure paths and bind immutable records`

### SEC-040 — One privacy scanner and honest privacy metadata

**Owner files**

- create `engine/.claude/skills/ss-learn/scripts/privacy-scan.mjs`;
- remove duplicate scanners from `learning.mjs` and `learning-package.mjs`;
- update the canonical `ss-learn` skill/reference docs; public copy remains owned by `WEB-001`.

**Contract**

```js
scanCandidatePrivacy(candidate)
// => { scannerVersion: 2, findings: [{ code, field }] }
```

- NFKC-normalize and remove zero-width/bidirectional control characters before checking.
- Check only bounded free-text fields, not declared SHA-256 evidence fields.
- Cover code/markup, URL/domain, email, local path, common secret forms, color values, international/KR
  phone, resident-ID-like values, IP, Luhn-valid card, and long account-like numbers.
- A finding reports code and field only; never echo the matched source.
- Record privacy metadata uses `rawMaterialIntended:false`, `networkTransmission:false`,
  `scannerVersion:2`, and `scannerGuarantee:"guardrail-only"`.

**Acceptance:** T10–T11 pass with positive and nearby negative fixtures.

**Commit boundary:** `fix(learn): harden privacy guardrails and claims`

### SEC-050 — Host-owned, action-bound approval proof

**Status: BLOCKED. Do not assign to a lower model until the maintainer supplies a real host adapter and
signed fixture.**

Remove fixed `APPROVE_*` strings and all `--attestation` flags only after choosing Codex/Claude native
approval or a verified MCP elicitation adapter. The operation must bind:

```json
{
  "schemaVersion": 1,
  "action": "review | prepare-share | mcp-read",
  "audience": "styleseed-local-cli | styleseed-learning-mcp",
  "subjectHash": "sha256:...",
  "argumentsHash": "sha256:...",
  "issuedAt": "...",
  "expiresAt": "..."
}
```

The host-adapter decision must freeze the signature algorithm, `keyId`, trusted/revoked-key source,
canonical signed bytes, signature envelope, maximum clock skew, and replay-ledger owner/path. The proof
contains issuer, request ID, operation hash, issued/expiry times, random nonce, and signature. TTL is at
most five minutes; audience/action/subject/arguments are exact; nonce/request ID is one-use. Trusted
issuer configuration lives outside the workspace. A workspace-minted HMAC is not accepted, and a
workspace replay ledger prevents reuse but does not itself authenticate a person.

Acceptance fixtures: one-bit payload/signature tamper, unknown/revoked key, future-issued beyond skew,
expired, replayed, wrong audience, action, subject, and arguments all fail closed.

Without an adapter: local actions are described as caller-attested only, and MCP fails closed.

### SEC-060 — MCP grant/consume v2

**Depends on:** `SEC-050`.

- grant input is `grantPath + grantHash`; package path is derived from the verified grant;
- grant binds package filename/hash, candidate ID, purpose, review hash, approval proof, expiry, and
  one remaining use, plus the candidate's `learningRevision` and the optional bridge
  `packageRevision`;
- consume order: atomic grant claim → approval/TTL/hash validation → derive package → no-follow open →
  reverify package/record/review → delete claim → return the package;
- mark the MCP tool `destructiveHint:true` because it consumes a one-time grant;
- responses never include absolute local paths; unknown protocol versions are not echoed;
- input uses a bounded incremental NDJSON decoder: request line ≤64 KiB, grant ≤32 KiB, package
  ≤256 KiB. An oversized request does not crash the server or discard the next well-formed request;
- no network or subprocess code is allowed.

**Acceptance:** T07, T08, and T09b pass, including exactly one success across eight concurrent requests.

### SEC-070 — Optional learning plugin

**Depends on:** `SEC-050`, `SEC-060`, and `PKG-002A`.

**Owner files**

- `extensions/learning/.codex-plugin/plugin.json` and its local `.mcp.json`;
- `packaging/codex/styleseed-learning-allowlist.json`;
- optional-target branches in the package builder/validator;
- optional clean-install fixtures. Core manifests/generator are owned by `PKG-002A/INTEG-002`.

- Core remains unchanged, skills-only, and exposes zero MCP servers.
- The separate opt-in plugin contains `ss-learn`, the hardened bridge, schemas, self-contained
  catalog, and only its required runtime.
- Its description explicitly discloses client/model exposure, no project scanning, no network
  transport, no automatic promotion, and one-use host approval.
- With no supported approval adapter it exits fail closed.
- Its generated inventory preserves `learningRevision` for the candidate contract and creates a full
  optional `packageRevision` for bridge/runtime files; grants bind both and MCP rehashes both before
  returning data.
- Uncompressed optional payload ≤2 MiB; every relative import resolves within staging; symlink,
  hardlink, special file, secret, oversized NDJSON, and missing adapter fixtures fail.

**Acceptance:** build/validate the optional staging package, run learning CLI/MCP smoke from staged
cwd, run T07/T08/T09b, and confirm core inventory remains byte-identical. Public install instructions
or submission remain a separate approval.

## 8. Deterministic build, integrity, and artifact-runtime tickets

### BLD-001 — Reproducible generated outputs

**Owner files**

- `demo-pricing/scripts/build-llms.mjs`;
- a new deterministic-generation test under `scripts/runtime-tests/`;
- generated outputs only by running the generator.

Remove wall-clock values from `llms-full.txt`, registry JSON, and `skins.css`, or derive an optional
timestamp from `SOURCE_DATE_EPOCH`. Content identity uses engine revision, not current time. Two
consecutive generator runs over unchanged sources must be byte-identical and leave `git diff` empty.

**Acceptance**

```bash
node --test scripts/runtime-tests/generation-reproducibility.test.mjs
node demo-pricing/scripts/build-llms.mjs
git diff --check
```

The reproducibility test runs generation twice against an isolated fixture/copy and compares output
inventories. `git diff --exit-code` belongs to clean-checkout CI after the ticket's source and generated
outputs are committed; it is not required from an intentionally dirty implementation worktree.

**Commit boundary:** `build: make generated distributions reproducible`

### INT-001A — Rehash actual bundle bytes

**Depends on:** `BLD-001`.

- modify `engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs`;
- add focused runtime tests.

`--check` must compare all three layers:

1. freshly compiled expected output;
2. stored manifest declarations;
3. actual bundle/palette bytes on disk.

Missing files, extra declared outputs, byte/size/hash mismatch, or source mismatch exit 2. Part A does
not redesign lock normalization; `ART-001/003` own that behavior.

**Acceptance:** `node --test scripts/runtime-tests/resolver-integrity.test.mjs`, generators,
`node scripts/validate-engine.mjs`, and `git diff --check`.

**Commit boundary:** `fix(resolve): verify actual generated artifact bytes`

### INT-001B — Rehash staged installed distribution bytes

**Depends on:** `SEC-001`, `PKG-001`.

- create `engine/.claude/skills/ss-resolve/scripts/distribution-integrity.mjs`;
- modify `scripts/build-context-catalog.mjs`;
- modify `engine/.claude/skills/ss-update/scripts/check-update.mjs`;
- create `scripts/runtime-tests/distribution-integrity.test.mjs`.

```js
verifyDistribution({ catalog, scriptPath })
// => { status: "verified" | "tampered" | "incomplete", computedRevision, mismatches }
```

Validate path sorting, duplicates, containment, bytes, and SHA-256 for every declared distribution
file, then recompute the revision from the actual digest list. If an install layout lacks required
files, return `installed-revision-unverified`; never `current`.

Catalog schema v4 replaces the ambiguous global payload with:

```json
{
  "engineRevision": "sha256:<same-as-core>",
  "distributions": {
    "core": {
      "revision": "sha256:...",
      "files": [{ "path": "engine/...", "sha256": "...", "bytes": 123 }]
    }
  }
}
```

Core files exclude `ss-learn`, MCP, and learning claims even before their source relocation. Resolver
manifests bind the core revision. The optional extension later adds its own package-local
`learningRevision`; it never changes what `engineRevision` means.

The core revision keeps one canonical logical skill inventory. At verification time, that inventory is
mapped to the physical skill tree that invoked the checker (`engine/.claude/skills/`, root `skills/`,
`.claude/skills/`, or `.agents/skills/`) and those actual bytes are rehashed. It intentionally excludes
`.codex-plugin/plugin.json`: the approved local-development cachebuster changes only that host manifest
version after staging. Package `inventory.json` still hashes the exact manifest shipped, while installed
engine integrity remains stable across that metadata-only mutation.

**Stop condition:** if `npx skills`, Claude plugin, and Codex plugin cannot all carry the files needed
for verification, keep the status unverified and fix packaging before claiming fail-closed integrity.

**Required negative tests**

- edit actual `effective-rules.md` without changing the manifest: exit 2;
- edit a distributed `SKILL.md` without changing catalog: update status is tampered/unverified;
- delete one distribution file: incomplete, never current;
- traversal, duplicate, or symlink catalog path: invalid.

**Acceptance:** `node --test scripts/runtime-tests/distribution-integrity.test.mjs`; build and validate
the staged core package; run staged resolver/update smoke commands; generators;
`node scripts/validate-engine.mjs`; `git diff --check`.

**Commit boundary:** `fix(update): rehash installed distribution payloads`

### ART-001 — Strict project/artifact contracts

**Depends on:** `INT-001A` interface names frozen.

**Owner files**

- create `ss-resolve/references/project.schema.json`;
- create `artifact-index.schema.json`, `artifact.schema.json`, and `manifest.schema.json` beside it;
- create `ss-resolve/scripts/runtime-contract.mjs`;
- create `scripts/runtime-tests/contracts.test.mjs`.

Exports:

```js
SAFE_ID
parseStrictJson(text, { maxBytes })
canonicalJson(value)
sha256(value)
normalizeProject(input, catalog)
normalizeArtifact(input, project, catalog)
normalizeIndex(input)
safeProjectPath(projectRoot, relativePath)
```

**Acceptance**

- extra/duplicate keys, nested and escaped-equivalent duplicate keys, and duplicate artifact IDs fail;
- unknown catalog IDs fail;
- absolute, `..`, NUL, and symlink escapes fail;
- defaults plus artifact override normalize identically regardless of input key order;
- JS validator enum fixtures and JSON Schema enums remain in parity.

```bash
node --test scripts/runtime-tests/contracts.test.mjs
node scripts/validate-engine.mjs
git diff --check
```

**Commit boundary:** `feat(runtime): define strict project and artifact contracts`

### ART-002 — Safe migration and registry loader

**Depends on:** `ART-001`.

**Owner files**

- create `ss-resolve/scripts/project-registry.mjs`;
- create `ss-resolve/scripts/migrate-project.mjs`;
- create `scripts/runtime-tests/registry.test.mjs`.

CLI:

```bash
node migrate-project.mjs --project-root . --from-lock STYLESEED.md --artifact default --dry-run
node migrate-project.mjs --project-root . --from-lock STYLESEED.md --artifact default --write
```

- Dry-run is the default and writes zero files.
- `--write` never edits/deletes `STYLESEED.md`.
- Existing project/index/artifact targets cause a no-overwrite failure.
- Only understood legacy fields migrate. Unknown/duplicate fields appear in `unmigratedFields`; they are
  not interpreted.
- `Primary action` color maps only to `brand.keyColor`.
- Writes use same-directory temp files and atomic rename.
- No registry means the legacy resolver still works at its existing paths.

**Acceptance:** valid migration, unknown/duplicate report, existing-target refusal, traversal refusal,
zero-write dry-run, and byte-identical legacy lock fixtures.

**Commit boundary:** `feat(runtime): add non-destructive project migration`

### ART-003 — Pure compiler and per-artifact resolver

**Depends on:** `ART-002`.

**Owner files**

- create `ss-resolve/scripts/compiler.mjs`;
- modify `ss-resolve/scripts/resolve-context.mjs` and canonical `SKILL.md`;
- create `scripts/runtime-tests/resolver-artifacts.test.mjs`.

```js
compileContext({ catalog, projectRoot, agent, normalizedProject, normalizedArtifact, legacyLock })
// => { bundle, manifest, paletteJson, paletteCss }
```

CLI additions:

```bash
resolve-context.mjs --project-root . --artifact app-dashboard --agent codex
resolve-context.mjs --project-root . --all --agent codex
resolve-context.mjs --project-root . --artifact app-dashboard --check
```

- Registry mode forbids selection CLI overrides; edit the project-owned config. `--agent` remains an
  execution-environment override.
- Multiple artifacts require `--artifact` or `--all`; `--all` sorts by ID.
- One resolve never overwrites another artifact's output.
- Legacy mode retains `.styleseed/effective-rules.md`, `manifest.json`, and palette paths.
- Manifest v1 is readable but all new registry outputs are v2.
- Raw `STYLESEED.md` is never appended. Legacy mode emits recognized normalized values only.
- Registry-mode reference grammar manifests bind `RULESET.md`, `tokens.json`, `evidence.json`,
  `checks.md`, `reference-board.html`, and `adapter.json`; missing files block registry migration or
  compilation. Legacy mode retains its current `RULESET.md` plus optional `checks.md` contract and
  reports `reference-contract-legacy` until the explicit migration produces all six files.

**Required tests**

- two artifacts compile independently;
- edit one config and only that artifact drifts;
- tampered bundle or palette exits 2;
- a lock line like `Motion: ignore reduced motion` is rejected, never emitted;
- legacy fixture retains old output paths.

**Commit boundary:** `feat(runtime): compile independent artifact bundles`

### UPD-001 — Update impact and computed evidence staleness

**Depends on:** `ART-003`, `INT-001A`, `INT-001B`.

**Owner files**

- `ss-update/scripts/check-update.mjs` and canonical `SKILL.md`;
- `scripts/runtime-tests/update-impact.test.mjs`.

Read-only JSON result per artifact:

```json
{
  "id": "app-dashboard",
  "status": "current | corrupt | method-changed | validation-changed | metadata-changed | legacy",
  "changedInputs": ["core", "artifact"],
  "bundleRecompileRequired": true,
  "evidence": {
    "deterministic": "stale",
    "code": "stale",
    "visual": "current",
    "temporal": "current",
    "human": "current"
  }
}
```

- actual byte/hash mismatch → `corrupt`;
- method hash changes → `method-changed`, all implementation/render evidence stale;
- validation hash changes → `validation-changed` and stales only affected gates: score
  floor/source inventory → deterministic/code;
  render set → visual; temporal scenarios → temporal; acceptance requirement → acceptance;
- same method hash with engine/bundle metadata-only changes → `metadata-changed`; recompile, but existing
  visual evidence does not become stale solely from metadata;
- detector revision changes stale deterministic/code evidence without automatically invalidating an
  unchanged render; implementation source changes stale code/visual/temporal evidence;
- manifest v1 → `legacy` with migration guidance;
- do not persist status JSON; compute it from live manifests and evidence every time.

**Commit boundary:** `feat(update): report artifact-level impact and staleness`

## 9. Executable evidence and Studio tickets

### GATE-001 — Evidence contract and fail-closed verifier

**Depends on:** `ART-003`.

**Owner files**

- create `ss-score/references/gate-run.schema.json`;
- create `ss-score/references/deterministic-report.schema.json`, `code-report.schema.json`,
  `visual-report.schema.json`, `temporal-report.schema.json`, and `acceptance-report.schema.json`;
- create `ss-score/scripts/evidence-contract.mjs` and `evidence-gate.mjs`;
- create `scripts/runtime-tests/evidence-gate.test.mjs`.

```js
verifyEvidenceRun({ projectRoot, artifactId, runId })
// => { ok, errors, warnings, gates }
```

CLI/writer lifecycle:

```bash
evidence-gate.mjs init --project-root . --artifact app-dashboard --run <safe-id>
evidence-gate.mjs attach --project-root . --artifact app-dashboard --run <safe-id> \
  --gate code|visual|temporal|human --report <project-relative-json>
evidence-gate.mjs verify --project-root . --artifact app-dashboard --run <safe-id> --json
evidence-gate.mjs verify --project-root . --all --json
```

`init` snapshots manifest/method/validation/bundle and implementation hashes. `attach` validates a typed report,
copies no external file, and records only contained project-relative paths plus hashes. `verify`
rehashes everything and is the only writer of `verification.json`; `--all` processes artifact IDs in
sorted order and returns nonzero if any required run is missing or invalid.

Typed reports:

- deterministic: detector revision, scanned source inventory hash, findings and severities;
- code: score, eight category scores, evidence references, reviewer kind/model when applicable;
- visual: inspection method, required render inventory, viewport/state/path/hash, findings;
- temporal: applicability, scenario IDs, recording/frame paths/hashes, reduced-motion result;
- acceptance: decision, bounded reviewer alias, reviewed-at, bound evidence hash, and an explicit note
  that the alias is not authenticated unless a `SEC-050` proof is present.

Source hashing recursively includes regular files under declared roots, sorts POSIX-relative paths,
does not follow symlinks, rejects hardlinks/special files and case-colliding paths, and caps one run at
20,000 files, 512 MiB total source bytes, 1 MiB per JSON report, and 50 MiB per render/recording unless
the artifact adapter declares a lower limit. Exceeding a cap fails with a count/size summary, never
partial success.

Verification rules:

- every evidence path is project-contained, realpath-contained, regular, size-bounded, and actually
  rehashed;
- artifact manifest method/bundle hashes match exactly;
- implementation source hash is computed over declared source-root contents, not trusted from a git
  SHA string;
- score below `scoreFloor` fails code evidence;
- every required render ID/state/viewport is present;
- temporal `not-applicable` is valid only when the artifact contract says it is not required;
- required temporal scenarios need hashed recording evidence;
- acceptance is required only when `humanAcceptance:true`.

Negative tests cover nonexistent evidence, traversal/symlink, screenshot tamper, score 79/80, missing
viewport, stale method, temporal required/not-applicable, and source change after evidence capture.

**Acceptance:** `node --test scripts/runtime-tests/evidence-gate.test.mjs`, generators,
`node scripts/validate-engine.mjs`, and `git diff --check`.

**Commit boundary:** `feat(gate): verify evidence files and coverage`

### GATE-002 — `styleseed check` with JSON/SARIF output

**Depends on:** `GATE-001`.

**Owner files**

- create `ss-score/scripts/styleseed-check.mjs`;
- modify canonical `ss-score/SKILL.md` and `ss-lint/SKILL.md`;
- create `scripts/runtime-tests/deterministic-check.test.mjs`.

CLI:

```bash
styleseed-check.mjs scan --project-root . --artifact app-dashboard \
  --format json --out .styleseed/evidence/app-dashboard/<run>/deterministic.json
styleseed-check.mjs scan --project-root . --all --format json
styleseed-check.mjs verify --project-root . --artifact app-dashboard --run <run-id>
```

Initial hard errors are limited to invalid/stale artifact manifests, missing target/source roots,
project escape, malformed evidence, and required coverage/hash failure.

Initial warning-only detectors:

- hardcoded colors outside registered token/theme files;
- arbitrary pixel values in supported Tailwind/CSS forms;
- `transition-all`;
- detected motion with no reduced-motion handling in the declared source set;
- focus suppression without a detected replacement;
- icon-only control without an accessible label in high-confidence JSX fixtures.

Output schemas are stable JSON and SARIF 2.1.0. Detector IDs are permanent (`SS001`, etc.) and include
file, line, evidence, severity, and fix guidance. A detector stays a warning until its fixture set has
zero known false-positive hard cases and a maintainer approves promotion.

**Acceptance:** `node --test scripts/runtime-tests/deterministic-check.test.mjs`, generators,
`node scripts/validate-engine.mjs`, and `git diff --check`.

**Commit boundary:** `feat(check): add deterministic StyleSeed diagnostics`

### STUDIO-001 — Derive Studio verification from evidence

**Depends on:** `GATE-001`, `GATE-002`.

**Owner files**

- `ss-studio/scripts/studio-run.mjs`;
- `ss-studio/references/artifact-contract.md` and canonical `SKILL.md`;
- `scripts/runtime-tests/studio-evidence.test.mjs`.

- Registry projects require `init --artifact <id>`.
- Run schema v2 stores artifact ID, manifest path, and method hash.
- Add `studio-run.mjs evidence --run <studio-run-id> --evidence-run <gate-run-id>`.
- The evidence command calls `verifyEvidenceRun()` and stores only its computed summary.
- `advance --stage verified` reruns verification; it never trusts the attach-time result.
- Remove the ability to create a pass via `gate --status pass --evidence arbitrary-string`.
- `fail` and `blocked` remain useful progress states, but only the verifier derives pass.
- Prototype URL can locate a built prototype; it is not evidence. Required recording must be a local,
  regular, hash-inventoried file.

**Acceptance:** nonexistent paths fail; evidence tampering after attach fails; static temporal N/A works;
required recording omission fails; only the complete fixture reaches verified.

```bash
node --test scripts/runtime-tests/studio-evidence.test.mjs
node scripts/validate-engine.mjs
git diff --check
```

**Commit boundary:** `fix(studio): require recomputed evidence before verified`

### INTEG-001 — Canon, managed routing, generated mirror, and CI

**Depends on:** `ART-003`, `UPD-001`, `GATE-001`, `GATE-002`, `STUDIO-001`,
`SEC-010/020/030/040`, `INT-001B`, and `ROUTER-001`. One integrator owns this ticket. A later
`INTEG-002` finalizes distribution after the core/learning split.

**Owner files**

- `engine/ARCHITECTURE.md`, `engine/AGENTS.md`;
- canonical `engine/.claude/skills/*/SKILL.md` files that consume an artifact;
- `scripts/validate-engine.mjs`, `.github/workflows/validate-engine.yml`;
- generated mirrors only by running generators.

Requirements:

- Every artifact-consuming skill first resolves the artifact ID and reads its bundle/manifest.
- No registry-aware skill falls back to the global legacy bundle.
- Remove stale universal doctrines found in `ss-audit` and `ss-flow` such as a universal 6px grid,
  forcing every card to the same treatment, maximum-four assumptions, mobile pull-to-refresh, universal
  bottom navigation, or `Hero → KPI Grid → Details → Lists` as a default structure.
- Add a small machine-readable skill contract matrix and validator: whether a skill consumes a bundle,
  may select a grammar, may mutate project config, and which evidence level it may claim.
- Setup/adopt may write a managed StyleSeed block to `AGENTS.md`, `CLAUDE.md`, or supported agent files
  only with explicit `--write`; dry-run is default; preserve all project instructions outside markers;
  refuse symlink/conflicting/multiple managed blocks.
- CI uses minimal permissions, pins third-party actions by immutable SHA in the release-hardening commit,
  runs all runtime/security tests, and fails when generation leaves a diff.

Full CI command contract:

```bash
node scripts/build-context-catalog.mjs
node demo-pricing/scripts/build-llms.mjs
node scripts/test-learning-security.mjs
node scripts/validate-palettes.mjs
node --test scripts/runtime-tests
node scripts/validate-engine.mjs
npm run build --prefix demo-pricing
git diff --check
git diff --exit-code
```

**Commit boundary:** `refactor(runtime): route all skills through artifact contracts`

## 10. Distribution, web dogfood, benchmark, and learning roadmap

### PKG-001 — Allowlist-only plugin builder

**Depends on:** `BLD-001`, `SEC-001`. It may run in parallel with artifact work after the default MCP
is removed.

Create `packaging/codex/allowlist.json`, `scripts/build-plugin-packages.mjs`, and
`scripts/validate-plugin-packages.mjs`. Staging output is `dist/plugins/styleseed/`; `dist/` remains
ignored. The source repository root is never the plugin source. Do not edit `.local-marketplace/**`.
Staging layout is fixed:

```text
dist/plugins/styleseed/
├── .codex-plugin/plugin.json           # host contract points skills to ./skills/
├── skills/<core-skill>/**              # generated physical discovery mirror
├── engine/.claude/skills/<core-skill>/**
├── engine/color/generator.mjs
├── engine/color/palettes.json
├── engine/VERSION
├── engine/<markdown named by catalog distributionFiles>
├── LICENSE
├── SECURITY.md
└── inventory.json
```

`packaging/codex/allowlist.json` enumerates literal files plus the only permitted trees:
`engine/.claude/skills/<core-skill>/**`, the byte-identical generated `skills/<core-skill>/**` discovery
mirror, and exactly the catalog-declared engine runtime files. It may not use `**` at repository root or
accept caller-supplied extra paths. Root `skills/` remains generated discovery output, while the engine
tree remains the canonical runtime source. Inventory and deterministic `styleseed-core.tar.gz` contain no
timestamp, uid/gid, or nondeterministic file order.

Explicit denylist: `.git`, `.DS_Store`, `.local-marketplace`, `.lazyweb`, `demo-pricing`, `showcase`,
`node_modules`, `.next`, `.vercel`, caches, logs, environment files, keys, and all symlinks.

Builder outputs an inventory with relative path, bytes, SHA-256, and total size. The inventory excludes
itself and any outer archive from its digest list, avoiding a self-referential hash. Acceptance:

- core uncompressed payload ≤ 5 MiB;
- zero symlinks and zero denied paths;
- every manifest path exists inside staging;
- every relative static import resolves within staging; staged resolver/update/check smoke commands run
  from the staged cwd;
- running the builder twice is byte-identical;
- a secret-name/content fixture fails packaging;
- hardlinks, symlinks, and special files fail packaging.

If an official plugin validator is available, run it against staging. If the validator's own
dependency is missing, report that layer as not verified instead of installing dependencies or
claiming a pass.

**Commit boundary:** `build(plugin): package only the public allowlist`

### PKG-010 — Clean local install smoke

**Status: BLOCKED on explicit install approval. Depends on:** `INTEG-002` and the exact `REL-001A`
release-candidate archive.

Use the local plugin development cachebuster/reinstall helper against a staging copy, never the source
repo. Do not manually edit marketplace JSON, delete the existing 1.1-GB cache, or repurpose semantic
version numbers as a cache key. In a fresh agent thread verify core skill discovery, zero MCP servers,
staged CLI smoke, installed inventory ≤10 MiB, and update integrity. Rollback/disable of the new install
is a separate approved operation; existing cache cleanup is not part of this ticket.

### ROUTER-001 — One primary StyleSeed entry skill

**Depends on:** `ART-003` CLI names frozen. Granular `ss-*` skills remain backward compatible.

**Owner files**

- create `engine/.claude/skills/styleseed/SKILL.md`;
- create `scripts/test-router-contract.mjs`;
- update router-specific generator/validator inventory only; generated mirror remains generator-owned.

The router chooses exactly one first workflow for setup, build, reference compilation, Studio,
audit, score, verify, update, or explicit learning capture. It resolves the current artifact first
when a registry exists, never fans out to “run every skill,” never copies the design handbook into
itself, and routes to learning only after an explicit capture request.

Acceptance is a table-driven intent fixture: exactly one first workflow per fixture, every public
workflow reachable, ambiguous input asks one bounded question, and granular direct invocation still
works. Public skill counts are generated by package composition (`router + non-learning skills`), not
hardcoded marketing text.

**Commit boundary:** `feat(skills): add a single StyleSeed router`

### PKG-002A — Isolate learning from the public core

**Depends on:** `PKG-001`, `WEB-001`, `SEC-010/020/030/040`, `ROUTER-001`, `INTEG-001`.

**Owner files**

- move `engine/.claude/skills/ss-learn/**` to `extensions/learning/skills/ss-learn/**` without losing
  hardened history/fixtures;
- move `mcp/styleseed-learning-server.mjs` to `extensions/learning/mcp/` after its source-only tests,
  leaving no learning runtime in the core root;
- create the self-contained learning catalog/revision source under `extensions/learning/runtime/**`;
- update `demo-pricing/scripts/build-llms.mjs`, `scripts/build-context-catalog.mjs`,
  `scripts/validate-engine.mjs`, and `packaging/codex/allowlist.json`;
- update `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, router/update migration messaging,
  and generator-owned README/web count sources;
- root `skills/**`, public registry, and count files only through generation.

- Core plugin: router plus design method, resolver, build/review/score/verify and deterministic checks;
  no learning skill, MCP, or learning capability claim.
- After the security commits, relocate the canonical learning skill to
  `extensions/learning/skills/ss-learn/` and give it a self-contained catalog/runtime. Core
  `engine/.claude/skills/` then contains the router plus the 22 non-learning `ss-*` skills; the root
  generated `skills/` mirror contains core only. This prevents default `npx skills add` discovery from
  silently installing the learning extension.
- Keep existing non-learning `ss-*` invocation compatibility. `$ss-learn` becomes an explicit optional
  install and must report a clear migration message when an old installation is detected.
- Include the tested `styleseed` router in core. Do not hardcode marketing counts; generate them.
- Remove `mcp` keyword, learning default prompt, and every learning/MCP claim from both core plugin
  manifests. A static grep fixture guards those fields.
- `npx skills add` remains a skills path. If a CLI-reliant skill lacks its runtime in a cherry-picked
  install, fail with a precise dependency message; never claim it ran.

Transitional count is explicit: after `ROUTER-001` but before this ticket, source contains router + 23
legacy skills (24) and no public count is updated. After this ticket, core contains router + 22
non-learning skills (23); only the generator publishes that count.

Acceptance: the core archive and root generated skill mirror contain no `ss-learn`, `.mcp.json`,
`mcp/`, learning keyword/default prompt/capability claim; hardened learning tests run from the
extension source; core staged smoke passes; no public learning install instructions are created.

**Commit boundary:** `build(plugin): isolate learning from public core`

### INTEG-002 — Final core distribution integration

**Depends on:** `PKG-002A`, `INT-001B`. Optional learning is validated only if `SEC-070` has completed;
it does not block a core-only release.

One integrator reruns every generator, validates core skill/catalog/count parity, checks all static
relative imports in staging, runs the full runtime/security suite, builds the web, builds/validates the
core archive, and asserts a clean post-generation diff in a clean checkout. It updates CI to reproduce
those exact steps. If an optional package exists, a separate conditional job validates its inventory,
revision, learning tests, and MCP smoke without allowing it to modify the core result.

**Commit boundary:** `build(release): finalize core distribution contracts`

### DOG-001 — Make the StyleSeed website its first multi-artifact consumer

**Depends on:** `ART-003`, `GATE-002`, `WEB-001`, `INTEG-002`.

**Owner inputs**

- `.styleseed/project.json`, `.styleseed/artifacts/index.json`;
- `.styleseed/artifacts/site-home.json`, `site-learn.json`, `site-gate.json`, `site-docs.json`;
- create `demo-pricing/scripts/capture-artifact-evidence.mjs` for Playwright capture only;
- bundles, manifests, palettes, and evidence summaries are generator/verifier output and are never
  hand-edited.

Fixed selections and coverage:

| Artifact | Route / source roots | Grammar · page · recipe · palette | Required evidence |
|---|---|---|---|
| `site-home` | `/`; `demo-pricing/app/page.tsx`, `_home/`, `globals.css` | `expressive-marketing` · `landing` · `expressive-brand` · `signal-coral` | loaded 390×844 + 1440×900, reduced-motion render; temporal hero/reduced-motion scenarios |
| `site-learn` | `/learn`; `demo-pricing/app/learn/`, `globals.css` | `editorial-reading` · `detail` · `editorial-authority` · `editorial-ink` | loaded 390×844 + 1440×900 |
| `site-gate` | `/gate`; `demo-pricing/app/gate/`, `globals.css` | `technical-instrument` · `detail` · `developer-platform` · `cobalt-instrument` | loaded 390×844 + 1440×900 |
| `site-docs` | `/architecture`; `demo-pricing/app/architecture/`, `demo-pricing/app/guides/`, `globals.css` | `editorial-reading` · `detail` · `editorial-authority` · `editorial-ink` | loaded 390×844 + 1440×900 |

All use adapter `product-ui`, domain `developer-tools`, profile `none`; token files are
`demo-pricing/app/globals.css` and generated `demo-pricing/app/skins.css`. `site-home` has
`temporal.required:true`; the others are false. Project defaults must not silently replace the explicit
artifact selections above.

Execution:

```bash
node engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs --project-root . --all --agent codex
node engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs --project-root . --all --check
npm run build --prefix demo-pricing
# Terminal A
npm run start --prefix demo-pricing
# Terminal B
node demo-pricing/scripts/capture-artifact-evidence.mjs --base-url http://127.0.0.1:3000 --all
node engine/.claude/skills/ss-score/scripts/styleseed-check.mjs scan --project-root . --all --format json
node engine/.claude/skills/ss-score/scripts/evidence-gate.mjs verify --project-root . --all --json
```

The capture script refuses a dirty/built-source hash mismatch, writes new PNG/recording files under the
correct run only, and never overwrites a prior run ID.

Compile them independently, then capture required mobile/desktop evidence. Dogfood acceptance:

- records the current implementation as a baseline before layout changes;
- binds commit SHA, engine revision, bundle hash, implementation hash, and required renders;
- preserves failed/stale runs instead of deleting or relabeling them;
- does not add a “StyleSeed verified” badge until the verifier passes.

This is product UI work: follow the active environment's UI-research rule, capture the actual current
screen, use real references, render the changed routes, and inspect the pixels before claiming a visual
pass. Build success alone is not visual verification.

Rollback preserves project/artifact inputs and marks failed/stale evidence through computed status;
do not delete a failed run to make the latest status look clean.

### WEB-002 — Installation-first homepage, implemented through dogfood

**Depends on:** `WEB-001`, `DOG-001`, `PKG-001`.

**Owner files**

- `demo-pricing/app/_home/hero.tsx`;
- `demo-pricing/app/_home/prompt-box.tsx`;
- homepage sections in `demo-pricing/app/page.tsx` and their styles only;
- new evidence for `site-home`; never reuse an older screenshot.

Before editing, perform the current environment's required quick UI reference search and generate the
screenshot-based report from the actual current page. If the report service is unavailable or quota
blocked, stop `PARTIAL` before UI edits; a quick search alone does not satisfy this gate. Then:

- make `npx skills add bitjaru/styleseed` the single primary hero CTA;
- move the long one-paste orchestration prompt into an advanced disclosure;
- show `choose → compile → build → code/render evidence` within the early narrative;
- demote competing header/showcase/prompt actions;
- show actual evidence states instead of unconditional verification language;
- keep competitor comparison capability-specific and source-linked. Re-verify immediately before the
  edit from the competitor's primary repository/docs, starting with
  `https://github.com/pbakaus/impeccable`; record source URL and observed date in the copy fixture.

Acceptance:

- at 390×844, the install CTA is visible before scrolling and no other filled CTA competes above it;
- at 1440×900, the product loop and proof are legible without the long prompt dominating;
- keyboard focus, disclosure, copy action, and no-clipboard fallback work;
- build passes, then both new renders are captured, hashed, inspected, and bound to a fresh evidence run;
- copy-only `WEB-001` remains independently revertible from this layout commit.

```bash
npm run build --prefix demo-pricing
node engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs --project-root . --artifact site-home --check
node engine/.claude/skills/ss-score/scripts/styleseed-check.mjs scan --project-root . --artifact site-home --format json
node engine/.claude/skills/ss-score/scripts/evidence-gate.mjs verify --project-root . --artifact site-home --run <new-run-id> --json
git diff --check
```

Deployment is not part of `WEB-002`. Rollback reverts only its layout commit while retaining
`WEB-001`, dogfood configs, and failed/stale evidence.

**Commit boundary:** `feat(web): make installation and runtime proof the primary path`

### BENCH-002A — Freeze the current-runtime protocol and harness

**Status: BLOCKED pending sibling-repo write approval; no model credential or paid run is needed.**
Target is `../pixelmind`, whose current untracked `cro/` is user-owned and must not be touched.

**Owner files**

- new `../pixelmind/bench/v2/**` and v2-only scripts under `../pixelmind/scripts/`;
- v2 script entries in `../pixelmind/package.json` only;
- BENCH-V1 files are immutable.

Freeze before any provider call:

- 20 existing anchor fixtures + 8 grammar/page/recipe conflict fixtures + 4 multi-artifact
  update/drift fixtures = 32 fixtures;
- 2 builders (Codex and Claude Code) × 4 conditions = 256 cells;
- conditions: `bare`, `compiled`, `compiled+deterministic`, `compiled+render-revise`;
- exact StyleSeed core archive hash, engine revision, artifact config/bundle, detector revision,
  builder model/version/config, renderer/browser/font inventory, judge model/seed, prompt, and fixture;
- separate scores for structural correctness, behavior/state coverage, accessibility, grammar fit,
  visual craft, and distinctiveness;
- 64 blinded bare-vs-render-revise human pairs (32 fixtures × 2 builders), three ratings per pair;
- primary claim gate: within each builder, paired render-revise minus bare total-score effect is positive
  and its stratified 95% bootstrap interval excludes zero; publish category effects and failures even
  when the primary gate fails. No universal `>=80` success criterion.

Dry-run prints 256 expected cells, all hashes, estimated provider calls, and estimated maximum cost,
then writes nothing outside `bench/v2`. Harness fixtures prove resume, timeout, duplicate-cell refusal,
immutable raw evidence, and deterministic finalization.

### BENCH-002B — Execute and analyze BENCH-V2

**Status: BLOCKED on explicit credential and maximum-budget approval. Depends on:** `BENCH-002A` frozen
protocol and exact `REL-001A` core release-candidate archive.

- Neutral VLM judge must pass five repeated judgments of one pinned screenshot with spread ≤3 before
  any result is publishable.
- Run/resume only missing cells; never replace a blocked provider score with an estimate.
- Preserve prompts, raw outputs, code, manifests, bundle/gate hashes, renders, recordings, errors,
  verdicts, cost/latency, and environment inventory.
- Human pairs remain separately reported from VLM scores; no blended opaque score.
- A failed stability or primary claim gate remains `non-publishable` evidence and is not deleted.

### BENCH-002C — Publish immutable benchmark evidence

**Status: BLOCKED on separate publication approval. Depends on:** completed `BENCH-002B`.

Finalize a v2 result manifest and evidence archive with SHA-256, publish as a new immutable benchmark
release, and read back every public link/hash. Never overwrite BENCH-V1 or relabel a diagnostic run as
publishable.

BENCH-V1 remains evidence for the earlier render-score-revise principle, not the new runtime.
`BENCH_WAIVER` is valid only when the maintainer explicitly names it. A waived release may make no new
performance, gate-effect, or superiority claim.

### LEARN-100 — Governed rule accumulation after the security/runtime foundation

**Depends on:** P0 security, artifact manifests, evidence gate, BENCH-V2 protocol.

Learning means accumulating **reviewed candidate rules**, not silently training on user projects.
Implement states:

```text
draft -> accepted-local | rejected
accepted-local -> corroborated -> promotion-proposed -> promoted | rejected
```

- Exact normalized fingerprint provides deterministic deduplication; semantic similarity is advisory.
- Conflicts are reported by overlapping context plus incompatible intervention/avoid conditions.
- Project, team, and core scopes are explicit.
- Promotion needs independent repetition, counterexamples, accessibility/grammar regression fixtures,
  benchmark evidence, and named maintainer approval.
- No candidate directly edits project/artifact/core rule files.
- Retention, revoke, purge, export preview, and audit receipt commands are required before shared intake.

`LEARN-110` may later add a correction recorder or Figma/import adapter, but neither is on the release
critical path.

### REL-001A — Prepare an immutable core release candidate

**Status: BLOCKED until explicit version/changelog authorization.** Recommended next line is `4.1.0`,
but an implementation model never chooses or bumps it.

**Depends on:** `INTEG-002`, `DOG-001`, `WEB-002`, and explicit authorization.

Release owner files only: `engine/VERSION`, `CHANGELOG.md`, core package manifests, maintained
`demo-pricing/content/version-source.json`, and generator outputs. Start from a clean exact SHA, verify
the requested version is new, then run INTEG-002 full CI, build the deterministic core archive, and
produce a release manifest containing git SHA, engine/core revision, archive/inventory SHA-256, sizes,
test results, and a `benchmarkStatus` of `pending | complete | waived`. This ticket may set `pending`;
only `REL-001B` requires a completed result or explicit maintainer `BENCH_WAIVER`. Optional artifacts
are built only if `SEC-070` separately passed; their absence does not block core.

`v4.0.0` may not be moved, deleted, recreated, or force-updated.

### REL-001B — Tag and publish the GitHub release

**Status: BLOCKED on separate tag/publish approval. Depends on:** approved `REL-001A` commit,
`PKG-010` clean-install proof, and completed `BENCH-002B` or explicit maintainer `BENCH_WAIVER`. If
release copy makes benchmark claims, `BENCH-002C` publication/read-back is also required.

Create a new annotated tag at the exact approved SHA, push without force, create the GitHub release
with the deterministic core archive/inventory/release manifest, then download and rehash the public
assets. A publication failure is recovered by withdrawing a bad asset/release or issuing `4.1.1`, never
by rewriting a public tag.

### REL-001C — Submit and verify the public core plugin

**Status: BLOCKED on separate directory/submission authorization. Depends on:** `REL-001B` and
`PKG-010` clean-install proof.

Submit only the skills-only core artifact. Verify directory metadata, installation into a clean
environment, router/granular discovery, zero MCP servers, staged CLI integrity, and exact archive hash
in a fresh thread. Optional learning submission is a different future approval after `SEC-070`.

### DEPLOY-001 — Deploy the versioned website

**Status: BLOCKED on separate production-deploy approval. Depends on:** `REL-001B` plus completed
dogfood/WEB-002 evidence, unless only `DEPLOY-000` truthful-copy hotfix is requested.

Record previous production deployment, deploy with `--prod --skip-domain`, browser-QA the candidate at
required routes/viewports, promote it, and independently read back live content/version endpoint. On
failure roll back to the recorded deployment and verify. Release publication and live deployment are
reported as separate evidence layers.

## 11. Parallel ownership and commit discipline

| Track | Tickets | Exclusive paths | May start |
|---|---|---|---|
| Truth/web | `WEB-001` | README/security and named web copy files | after SEC-001 |
| Learning security | `SEC-*` | learning scripts/schemas/MCP | after `SEC-001` |
| Build/package | `BLD-001`, `PKG-001`, `ROUTER-001` | generator, package builder, router | router after ART-003 |
| Runtime contracts | `INT-001A/B`, `ART-001/002` | resolver integrity/contracts/migration | per graph |
| Runtime compiler | `ART-003`, `UPD-001` | compiler/resolver/update | after ART-002 |
| Evidence | `GATE-*`, `STUDIO-001` | score/lint evidence scripts, Studio | after ART-003 |
| Integration | `INTEG-001`, `PKG-002A`, `INTEG-002` | canon, split, final generated distribution | sequential owners |
| Proof/release | `DOG-001`, `WEB-002`, `BENCH-002A/B/C`, `REL-001A/B/C`, `DEPLOY-*` | dogfood, bench, release, deploy | explicit gates only |

Rules:

- one ticket per commit unless this plan explicitly combines two security primitives;
- never mix web copy, engine canon, security, compatibility, and generated output in an unexplained
  catch-all commit;
- before editing, run `git status --short` and stop if an unrelated dirty file overlaps owned paths;
- do not commit unless the task owner explicitly requested a commit;
- a task updates its evidence log in the handoff/report, not by changing ticket scope.

## 12. Gates

### P0 implementation exit

All must be true:

- default plugin exposes zero MCP servers;
- T01–T06, T09a, and T10–T11 pass; no path escape/outside write;
- actual bundle and installed payload tampering is detected;
- raw/unbounded lock text cannot become executable bundle policy;
- two artifacts compile independently without overwrite;
- web/security copy states current limitations;
- plugin staging contains no repo caches and meets the size/inventory gate;
- generators are reproducible;
- version/changelog/release/deploy remain untouched.

### Runtime/evidence exit

- update impact is artifact-specific and computed from live hashes;
- missing/nonexistent/tampered evidence cannot produce a pass;
- Studio cannot reach verified from caller-supplied strings;
- source detector warnings have fixtures and do not hard fail without promotion evidence;
- all artifact-consuming skills route through artifact ID in registry mode;
- full CI commands pass and a post-generation diff is empty.

### Release exit

- BENCH-002A/B release slice is complete, or the maintainer explicitly records `BENCH_WAIVER`; a
  waiver forbids new performance, gate-effect, or superiority claims;
- website dogfood has actual desktop/mobile captures and inspected render evidence;
- clean-install core package inventory and behavior pass;
- optional learning plugin is withheld unless host approval proof plus T07/T08/T09b passes;
- maintainer explicitly authorizes version bump, tag, publish, and deploy.

## 13. Lower-model stop conditions

Stop and report, without improvising, if:

- a task needs an `engine/VERSION`, changelog, tag, publish, deploy, or external message change;
- a host-signed approval adapter/fixture is missing;
- a public install omits files required to verify its distribution;
- migration would overwrite an existing project/index/artifact or project-owned instruction block;
- a regex detector would need hard-error authority without measured fixture precision;
- actual render/recording is unavailable but a pass is expected;
- a reviewer string is being presented as authenticated identity;
- an unrelated dirty file overlaps the ticket's owner files;
- generated `skills/**` would need direct editing;
- the sibling benchmark repo's existing untracked files would need moving/deleting;
- a credential, external budget, or destructive operation is required but not authorized.

## 14. Copy/paste kickoff prompt for the coding model

```text
Repository: /Users/snoo/Documents/Kiwi/Projects/DesignSystem/styleseed
Plan: docs/NEXT-RUNTIME-IMPLEMENTATION-PLAN.md

Read AGENTS.md and every nested AGENTS.md that applies to the owned files.
Then implement exactly ticket <TASK-ID>. Do not begin another ticket.

Rules:
1. Run git status --short and the ticket baseline checks before editing.
2. Touch only the files owned by <TASK-ID>. Preserve unrelated and project-owned changes.
3. Add the named negative tests before changing behavior.
4. Unknown fields, unsafe paths, missing files, and missing evidence fail closed. Do not invent data.
5. Verify actual file bytes and SHA-256; never trust a claimed manifest hash by itself.
6. Do not edit engine/VERSION, CHANGELOG, tags, releases, deployments, Slack, or generated skills/**.
   Only a separately approved REL/DEPLOY ticket can override its exact owned item; generated files are
   still generator-only.
7. Use apply_patch for source edits. Run generators only when the ticket says to.
8. Finish with the ticket acceptance commands and git diff --check.
9. Report: changed files, commands and exact outcomes, remaining limitations, and VERIFIED/PARTIAL/NOT VERIFIED for code, rendered UI, release, and live deployment separately.
10. Do not commit unless explicitly asked. Stop on any plan stop condition.
```

Recommended first assignments:

1. one model: `BLD-001`;
2. next model: `SEC-001`;
3. next model after SEC-001: `WEB-001`;
4. package owner: `PKG-001` after both `BLD-001` and `SEC-001`;
5. after those land, security owner: `SEC-010 + SEC-020 + SEC-030`;
6. runtime owner: `INT-001A`, then `ART-001`, one ticket at a time; `INT-001B` follows staged packaging.

## 15. Per-ticket completion report template

```markdown
## <TASK-ID> completion

- Status: VERIFIED | PARTIAL | NOT VERIFIED
- Base SHA:
- Changed files:
- Behavior changed:
- Negative tests added:
- Commands run and exit codes:
- Generated files changed by canonical generator:
- Known limitations:
- Evidence not verified (visual/release/live/etc.):
- Stop conditions encountered:
- Suggested next READY ticket (do not implement it):
```
