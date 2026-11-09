# Component contracts

One file per engine component, in the shape designers use for Figma component descriptions:
purpose · anatomy · variants · states · do / don't · known gaps · sources, then a generated
**From the code** block (parts, props, sizes, tokens consumed, radius, focus, motion, machine checks).

- Edit everything above the `<!-- generated:start` marker by hand. It is judgment: when to use the
  component, which variant, what is forbidden. GitHub's web editor is fine.
- Do not edit the generated block. `node scripts/build-component-contracts.mjs` rewrites it from the
  component source and writes `demo-pricing/content/component-contracts.json` for the gallery.
- The **Variants** and **Sizes** tables name code values in backticks (`` `default` ``). The build fails
  when a table and the code disagree, so a new variant cannot ship undocumented and a removed one
  cannot stay in the docs. CI runs the same build (`scripts/verify-repo.mjs`).
- **Known gaps** records where the code, `DESIGN-LANGUAGE.md` and the craft baseline disagree, or where
  the component falls short of a rule. It says what is true today; fixing a gap is a separate change.

First set, in the order a designer builds a system (#96, #102): button, badge, tabs, input, select,
switch, table. The gallery page for each (`/gallery/<id>`) renders these contracts with live examples
that import the real component.
