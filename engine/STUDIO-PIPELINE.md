# StyleSeed Studio Pipeline

StyleSeed Studio turns a product brief into a directed, interactive, and reviewable UI concept.
It extends StyleSeed's fixed design judgment into creative direction, generated media, interaction
scenes, and a prototype-first showcase reel. The pipeline is for client work and product
exploration where a static screen is not enough.

## Product boundary

StyleSeed owns the decisions, manifests, provenance, and verification. Image and video models are
replaceable renderers. A provider result never becomes the design method merely because it looks
fashionable.

The pipeline must produce a working interface before it produces a promotional reel. Generated
video may supply ambient footage, texture, or an optional transition plate; it may not conceal a
non-functional interaction behind a pre-rendered animation.

## Vertical-slice flow

```text
brief + constraints
  → reference scout (structure · navigation · signature · motion · asset language)
  → three creative directions (native · signature · experimental)
  → human selection gate
  → interaction scenes + generated-media jobs
  → working prototype
  → code gate + pixel gate + temporal gate
  → prototype-first showcase reel
  → human acceptance + archived evidence
```

Every run lives at `.styleseed/studio/<run-id>/`. `run.json` records the stage and points to the
separate human-readable and machine-readable artifacts.

## Stage contracts

### 1. Briefed

Capture the user's job, audience, primary action, platform, surface, content, brand constraints,
delivery target, and explicit non-goals. A vague request such as “make it trendy” is not a usable
brief until the product job and interaction moment are known.

### 2. Directed

Collect references into roles rather than a moodboard pile:

| Role | Question |
|---|---|
| Structure | What organizes the screen and its attention? |
| Navigation | How are product chrome and content canvas distinguished? |
| Signature | Which one memorable move belongs to this product? |
| Motion | Which objects persist, transform, enter, or exit? |
| Asset language | What imagery, texture, illustration, or footage supports the UI? |

Compile exactly three directions against the same product job:

- `native`: platform-familiar, lower-risk, restrained signature;
- `signature`: a distinctive product-owned composition and interaction;
- `experimental`: a higher-expression transfer test with explicit cost and risk.

Each direction specifies composition, navigation chrome, type, a semantic palette recipe, generated asset
strategy, motion logic, signature move, trade-offs, and the StyleSeed grammar/recipe it uses.

### 3. Selected

Do not silently average directions or build all three to completion. Record the selected direction,
decision maker, timestamp, and rationale. Preserve rejected directions so the decision remains
auditable.

### 4. Planned

Compile the selected direction into two executable plans.

#### Interaction scene

An interaction scene is a state transition, not an animation adjective:

```text
trigger · from state · to state · continuity objects · entering objects · exiting objects
feedback · interruption/cancel behavior · reduced-motion behavior · renderer target
```

Navigation must define the relationship between `navigation chrome` and `content canvas`, including
resting, selected, scrolling, overlay, and compact states when they apply.

#### Media job

Every generated asset or clip records:

```text
role · kind · provider capability · prompt · inputs · output · status
source/provenance · usage rights note · fallback · consuming scene
```

Prefer code-native CSS/SVG for interface geometry and icons. Use raster generation for imagery,
texture, illustration, and product/scene material. Use video generation for ambient or narrative
media that cannot be expressed as a real UI transition. Never ask an image model to render final UI
copy that must remain editable and accessible.

### 5. Built

Build the selected direction as a working prototype. The primary path, navigation, back/cancel
behavior, loading/error state where relevant, responsive target, and reduced-motion alternative
must be executable. Store the prototype path or URL in `run.json`.

### 6. Verified

All four gates must pass:

1. **Code:** build/type/lint plus StyleSeed score.
2. **Visual:** actual screenshots at locked viewports and states.
3. **Temporal:** actual prototype recording, start/mid/end frames, interrupt/cancel, and reduced motion.
4. **Human:** named reviewer accepts the selected direction and the working result.

The showcase reel is assembled after the working prototype passes. Keep a shot manifest that says
which shots are real prototype recordings and which, if any, are generated media.

## Creativity without random collage

Novelty comes from controlled recombination:

```text
one product job
× one selected output grammar
× one brand recipe
× one semantic palette recipe
× one navigation chrome model
× one signature interaction
× one asset language
= one coherent direction
```

Change at least two structural axes between directions. Merely swapping palette, radius, or motion
seed does not create a new direction. Do not copy a company's protected assets, logo, copy, or
trademarked arrangement. References provide evidence for transferable principles.

## Provider adapter boundary

Studio asks for capabilities, not vendor names:

- `raster-generate`, `raster-edit`, `raster-cutout`;
- `video-generate`, `image-to-video`, `video-edit`;
- `prototype-record`, `frame-extract`, `reel-compose`.

An agent maps those capabilities to available local tools. If no provider is available, keep the
job `blocked`; do not fabricate an output path or mark the run verified. All generated files must be
copied into the project run and retain prompt and provider provenance.

## External-work acceptance package

For client or outsourced work, deliver:

- the brief and classified reference list;
- all three directions and the recorded selection;
- the effective StyleSeed rules and interaction scenes;
- prompts, inputs, outputs, provenance, and rights notes for media jobs;
- runnable prototype source and URL/path;
- screenshots and prototype-first reel;
- gate results, unresolved risks, and reviewer acceptance.

The package is the reusable asset. A polished MP4 without these artifacts is not a completed Studio
run.
