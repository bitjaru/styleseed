# Token canon — research for #96

This folder holds the proposal for StyleSeed's token canon: one source of truth that generates
CSS variables, Tailwind theme values, and Figma variables, laid out in the order a working
designer builds a system. It is research until the engine reads it; nothing here is compiled yet.

The order comes from a designer who builds systems for a living:

1. Business and audience → mood
2. Key colour and typeface (Korean body text: Pretendard)
3. **Primitives first**: brand, sub, sub2, and status colours, each as a 50–950 ramp
4. **Semantic** colours split by property — `fg` / `bg` / `bd` — with an emphasis suffix
5. **Type roles** from the typeface: h1–h5, body, component text
6. **Components** built on the layers above: button variants, chip, tab, input, select, switch, table
7. Review

`naming-sample.tokens.json` is that order written in the Design Tokens Format Module 2025.10:
colours as `{ colorSpace, components, hex }`, references as `{group.token}`, type roles as
typography composites with dimension objects. `scripts/check-token-layers.mjs` enforces the layering:
only primitives hold literals, semantic tokens alias primitives, component tokens alias semantic
tokens, every alias resolves without cycles to a token of the same type, and semantic colour paths
read `semantic.{fg|bg|bd}[.{role}].{emphasis}`.

## Naming proposal

```
{layer}.{property}[.{role}].{emphasis}[.{state}]

layer     primitive · semantic · type · component
property  fg (text and icons) · bg (surfaces) · bd (borders and dividers)
role      brand · success · warning · danger · info    (absent = neutral)
emphasis  base · subtle · muted · emphasis · inverse
state     default · hover · active · selected · disabled   (component layer only)
```

The emphasis vocabulary is the one the designer already uses (`fg-base`, `fg-subtle`, `fg-muted`,
`fg-emphasis`). It is the same family as GitHub Primer's `fg.default / fg.muted / fg.subtle /
fg.onEmphasis`; Primer says `default` where this proposal says `base`. Atlassian's
`color.{property}.{role}.{emphasis}.{state}` has the same spine with the role before the emphasis,
which this proposal follows for status and brand colours.

Examples from the sample:

| Path | Aliases | Meaning |
|---|---|---|
| `semantic.fg.base` | `primitive.neutral.900` | default text |
| `semantic.fg.muted` | `primitive.neutral.500` | de-emphasised text, still readable |
| `semantic.fg.inverse` | `primitive.white` | text on an emphasis surface |
| `semantic.bg.brand.subtle` | `primitive.brand.50` | brand tint for selected rows |
| `semantic.bg.danger.emphasis` | `primitive.red.700` | destructive solid surface |
| `semantic.bd.emphasis` | `primitive.neutral.400` | strong divider |
| `component.button.primary.bg.hover` | `semantic.bg.brand.emphasis` | hover on the primary button |
| `component.tab.bd.active` | `semantic.bd.brand.base` | active tab indicator |
| `type.body` | — | 16px / 400 / 1.6, Pretendard |

Not allowed:

- `semantic.text.primary: #3C3C3C` — a literal in the semantic layer; change the primitive instead
- `component.button.primary.bg: {primitive.brand.700}` — a component skipping the semantic layer
- `semantic.fg.strong` — an emphasis word outside the shared vocabulary
- `semantic.subtle.success` — emphasis before role
- `type.text-md` — a size where a role belongs

## Decisions still open (answer any of them in #96)

1. Emphasis words beyond `base · subtle · muted · emphasis · inverse` — is `disabled` an emphasis or
   a component state only?
2. Mobile type sizes: a `mode` on each role, or separate roles?
3. Which status roles are primitives with full ramps (`red`, `green`, `amber`, `blue`) and which stay
   single values?
4. The first component set after button: chip and tab are in the sample; input, select, switch,
   table come next.

## What happens to this

- **Done (#104):** projects with an existing system import their own DTCG / Tokens Studio / Figma
  Variables file as the canon through `tokens` in `.styleseed/project.json`. The layer checker moved
  into the installed resolver (`ss-resolve/scripts/token-canon.mjs`); `scripts/check-token-layers.mjs`
  re-exports it for this sample. The resolver maps StyleSeed's roles onto the canon paths above
  (`semantic.bg.base` → background, `semantic.bg.brand.base` → primary, …), so this sample imports
  without configuration except the accent pair. See the
  [token canon guide](../../engine/.claude/skills/styleseed/workflows/ss-resolve/references/tokens.md).
  Two sample edits came out of that: `semantic.bg.warning.emphasis` was added (the other status
  roles had it), and `semantic.fg.muted` now aliases `neutral.600` because `neutral.500` on white
  measured 4.29:1, under the 4.5:1 gate the import checks.
- The engine's palette generator already produces 50–950 ramps and roles; the next step maps its
  output onto this layering so semantic roles alias the ramp instead of copying values.
- `engine/docs/tokens-studio.json` (hand-maintained today) becomes generated from the canon,
  together with CSS variables and the Tailwind theme; a drift check in CI compares them.

References: [DTCG Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) ·
[Primer colour overview](https://primer.style/foundations/color/overview) ·
[Atlassian colour foundations](https://atlassian.design/foundations/color) ·
[Nathan Curtis, Naming Tokens in Design Systems](https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676)
