---
name: ss-studio
description: Turn a product brief and optional references into three distinct creative directions, a human-selected StyleSeed interaction plan, generated image/video asset jobs, a working UI prototype, and a verified prototype-first showcase reel. Use for client concepts, app interaction exploration, trendy but coherent UI direction, reference discovery and synthesis, or any request that needs more than one static screen.
---

# Build a directed interactive concept
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

Run the full Studio pipeline. Do not reduce it to a moodboard, a static image, or a set of arbitrary
motion effects.

## Start the run

Read `STUDIO-PIPELINE.md`, `PRODUCT-PRINCIPLES.md`, and the resolved project rules first. If the
project has no valid `STYLESEED.md`, run setup and resolve before Studio.

Initialize a durable run:

```bash
node <skill-dir>/scripts/studio-run.mjs init \
  --project-root . \
  --artifact <artifact-id> \
  --name "<project or concept>" \
  --brief "<product job and desired interaction>" \
  --surface mobile-app \
  --platform web
```

The command prints the run directory under `.styleseed/studio/`. Use the artifact schemas in
`references/artifact-contract.md`. Use `references/provider-adapters.md` only when media generation
or recording is required.

If the project uses the artifact registry, `--artifact` is required and the run binds the current
artifact manifest and method hash at init time.

## 1. Scout by role

Classify supplied and discovered references as `structure`, `navigation`, `signature`, `motion`, or
`asset-language`. Capture source URL/path, date, visible observation, transferable principle,
confidence, and rights note. Never claim visual evidence for a reference that was not actually seen.

Do not ask the user to collect a generic moodboard. Find only the missing roles. Keep product UI,
marketing presentation, and generated media separate unless the brief explicitly connects them.

## 2. Produce three directions

Write exactly three entries in `directions.json`: `native`, `signature`, and `experimental`. Keep
the product job and content fixed; vary at least two structural axes. Every direction must include:

- composition and focal logic;
- navigation chrome versus content canvas;
- one semantic palette recipe, type, and material roles;
- generated asset strategy;
- motion and continuity logic;
- one product-specific signature move;
- output grammar, brand recipe, trade-offs, implementation cost, and risk.

Advance only after the directions validate:

```bash
node <skill-dir>/scripts/studio-run.mjs advance --project-root . --run <id> --stage directed
```

## 3. Require a selection

Show the three directions together. Record the user's selection and rationale. Do not average them
or quietly choose the easiest one.

```bash
node <skill-dir>/scripts/studio-run.mjs select \
  --project-root . --run <id> --direction <direction-id> \
  --by "<reviewer>" --rationale "<decision>"
```

## 4. Compile scenes and media jobs

Write `scenes.json`, `assets.json`, and `video.json` from the selected direction.

- An interaction scene defines trigger, states, continuity, enter/exit, feedback, interruption,
  reduced-motion behavior, and renderer targets.
- An asset job defines capability, prompt, inputs, output, provenance, rights note, fallback, and
  consuming scene.
- A video plan starts with real prototype recordings. Mark generative shots explicitly; never use
  them to fake an interaction that does not work.

Map capability to an available provider only at execution time. If the needed provider is absent,
leave the job `blocked` and report the exact missing capability.

Record provider execution without hand-editing the run:

```bash
node <skill-dir>/scripts/studio-run.mjs media \
  --project-root . --run <id> --job <job-id> --status complete \
  --provider <tool/model> --output <project-relative-path> \
  --provenance "<model · date · source inputs>"
```

## 5. Generate, build, and record

Generate raster assets only for imagery, texture, illustration, footage, or product material. Keep
UI geometry, icons, and final copy code-native and accessible. Copy final generated files into the
run directory and preserve prompts and provenance.

Build the selected direction as a working prototype. Implement its primary navigation, signature
scene, cancel/back behavior, and reduced-motion fallback. Record the actual prototype after it
passes the code and pixel gates. Optional generated footage may be composited as labeled media.

Store prototype and recording paths through the CLI, then advance to `built`:

```bash
node <skill-dir>/scripts/studio-run.mjs output \
  --project-root . --run <id> --prototype <route-or-path>
node <skill-dir>/scripts/studio-run.mjs advance \
  --project-root . --run <id> --stage built
node <skill-dir>/scripts/studio-run.mjs output \
  --project-root . --run <id> --recording <project-relative-path>
```

## 6. Verify and deliver

Run StyleSeed score and visual verification, then derive Studio verification from the evidence gate.
The Studio evidence command stores only the computed verifier summary, and `advance --stage verified`
reruns verification instead of trusting an earlier stored pass.

```bash
node <skill-dir>/scripts/studio-run.mjs evidence \
  --project-root . --run <id> --evidence-run <gate-run-id>
```

```bash
node <skill-dir>/scripts/studio-run.mjs advance --project-root . --run <id> --stage verified
node <skill-dir>/scripts/studio-run.mjs status --project-root . --run <id>
```

`fail` and `blocked` remain useful progress states:

```bash
node <skill-dir>/scripts/studio-run.mjs gate \
  --project-root . --run <id> --gate temporal --status blocked \
  --note "recording still missing"
```

Do not use `gate --status pass`. Only the evidence verifier may derive `pass`. A prototype URL can
locate the built prototype, but it is not evidence. When temporal verification is required, the
recording must be a local hashed file.

Deliver the complete run folder, runnable prototype, actual recording, and unresolved risks. A
polished reel by itself is not a completed Studio run.

## Non-negotiables

- Keep exactly one selected design direction and one coherent product language.
- Human selection precedes expensive generation and implementation.
- Do not clone protected brand assets, copy, or trademarked arrangements.
- Do not fabricate reference observations, provider outputs, file paths, or verification passes.
- Do not let generated imagery carry essential UI text or interaction semantics.
- Do not mark a run verified without seeing the pixels and the temporal result.
