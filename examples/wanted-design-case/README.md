# Wanted submission case — folio

A new, local StyleSeed application example for the September 17 screenshot revision.
The client names, dates, deliverable artwork, feedback and progress values are fictional
sample content. The artwork is code-rendered; the displayed `.fig` name is sample UI content,
not a downloadable Figma file. This is not the deployed `/try` experience.

The two working views demonstrate different jobs under one shared system:

- List: prioritize pending client feedback, search projects and open a review.
- Detail: inspect a sample deliverable, write a note and mark the review complete.
- Evidence view: show the design decisions, shared component implementations and actual
  compiled rule files used for this example.

The in-memory state resets on reload. There is no backend or live customer data.
No fresh independent model session, human acceptance, deployment or contest submission
is established by these screenshots. The sample client feedback is fictional and must not
be represented as a real StyleSeed finding or user endorsement.

## Reproduce from the repository root

```sh
node engine/.claude/skills/ss-resolve/scripts/resolve-context.mjs --project-root examples/wanted-design-case --all --agent codex
node examples/wanted-design-case/build.mjs
python3 -m http.server 43871 --bind 127.0.0.1 --directory examples/wanted-design-case/dist
# In a second terminal, using the repository's existing Playwright installation:
node examples/wanted-design-case/capture.mjs
```

Open `http://127.0.0.1:43871/?view=list`, `?view=detail`, or `?view=decisions`.
Add `&capture=1` for the 1920×1080 presentation canvas. The capture uses the live DOM;
it does not paste a fabricated product screenshot into a mock browser window.

Output: `artifacts/wanted-20260917/`. The three numbered PNGs form the submission draft.
Desktop and mobile captures and interaction checks are separate review evidence.

## Rule contract

`operations-console × product-ui × productivity × list/detail × enterprise-workbench × quiet-mineral`

Configuration: `.styleseed/project.json`, `.styleseed/artifacts/project-list.json`,
`.styleseed/artifacts/project-detail.json`. Compiled bundles and manifests live under
`.styleseed/bundles/` and `.styleseed/manifests/`.

`src/components.js` is shared by both views. `src/tokens.css` maps generated semantic
palette roles and records sample-art colors separately. The screenshot frame is presentation
chrome; it is not a new hosted StyleSeed editor or autonomous generation feature.
