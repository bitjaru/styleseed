# StyleSeed Roadmap

What we are building next, in order. Each item ships only with the same bar the engine already
enforces on itself: executable checks first, rendered evidence, and no public claim ahead of the
implementation. Progress is tracked in the linked issues — comments and counter-proposals welcome.

## Now (v4.x)

- **CI design gate** — run `ss-score` and the deterministic checks on pull requests and attach the
  score plus named deductions as a check run, so a design regression fails CI the same way a broken
  test does.
- **Korean typography & UX-writing rules** — extend the canon beyond Latin-first assumptions:
  line-length and line-height rules for Hangul, mixed-script hierarchy, and Korean microcopy
  patterns in `UX-WRITING.md`.

## Next

- **Public adapter specification** — document the surface-adapter contract so the community can add
  new hosts and render targets without touching the core, with a conformance checklist per adapter.
- **Accessibility checks expansion** — grow the deterministic floor from color-contrast pairs to
  focus order, target sizes, and reduced-motion coverage in the temporal gate.

## Later

- **Public evidence viewer** — a read-only page that renders an artifact's manifest, gates, and
  captured evidence, so a project can show *why* its screens pass rather than assert that they do.
- **Community grammars** — a reviewed path for contributing new output grammars (beyond the built-in
  eight) with the same twelve-axis contract and evidence requirements.

## Principles that do not change

Accessibility floors, the single-accent default, evidence bound to exact bytes, and human
acceptance before "verified" are not roadmap items — they are the product. See
[`engine/PRODUCT-PRINCIPLES.md`](engine/PRODUCT-PRINCIPLES.md).
