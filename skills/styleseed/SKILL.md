---
name: styleseed
description: Route a StyleSeed request to exactly one first workflow after resolving the current artifact boundary. Use when the user asks generally for StyleSeed help rather than invoking one specific ss-* skill.
argument-hint: "[request or goal]"
allowed-tools: Read, Grep, Glob, Bash
---

# StyleSeed router
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

This router chooses exactly one first workflow. It is the primary entry skill when a user asks for
StyleSeed help in general terms.

## First principles

- Resolve the current artifact first when `.styleseed/project.json` and `.styleseed/artifacts/index.json`
  exist.
- Never fan out to “run every StyleSeed skill.”
- Never copy the full design handbook into this router. Route to the maintained skill that already
  owns the workflow.
- Learning is an optional extension, not part of the core install. Only after an explicit capture
  request such as “remember this lesson” may the router check whether `ss-learn` is separately
  installed. If absent, state the dependency precisely; never auto-install it.
- If the request is ambiguous, ask one bounded clarification question that decides the first workflow.

## Registry-first artifact boundary

If the project uses the artifact registry:

- read the current artifact context first;
- when one artifact is clearly in scope, route with that artifact;
- when multiple artifacts exist and the user did not name one, ask one bounded artifact question;
- do not resolve all artifacts unless the user explicitly asks for all artifacts.

## One-workflow routing table

Choose exactly one first workflow:

- `ss-setup` for first-time method setup, missing lock/setup, or “set up StyleSeed for this project.”
- `ss-build` for implementing or redesigning a concrete screen/component/page when the direction is already known.
- `ss-reference` for compiling supplied references that are not already represented by a maintained grammar.
- `ss-studio` for creative direction, exploration, concept generation, or multi-direction concept work.
- `ss-audit` for critique, heuristic review, UX issue finding, or “what is wrong with this screen.”
- `ss-score` for code/design quality scoring or gate-floor measurement.
- `ss-verify` for rendered pixel inspection, screenshot review, or visual verification.
- `ss-update` for refreshing an installed StyleSeed payload or checking whether it is current.
- separately installed `ss-learn` only for explicit learning capture requests; otherwise report that
  the optional learning extension is unavailable.

## Bounded clarification rules

Ask one bounded clarification question only when needed to choose the first workflow:

- setup vs build: “Should I set up the design method first, or build the screen with the current method?”
- build vs reference: “Should I build from the current method, or compile the supplied reference into a project-local grammar first?”
- build vs studio: “Do you want one concrete implementation path, or three creative directions first?”
- audit vs score vs verify: “Do you want UX critique, code-score gating, or pixel verification first?”
- multi-artifact registry: “Which artifact should I resolve first: `<id-a>` or `<id-b>`?”

After one bounded question is answered, route to exactly one first workflow.

## Direct invocation compatibility

Granular `ss-*` skills remain backward compatible. If the user explicitly invokes `ss-setup`,
`ss-build`, `ss-reference`, `ss-studio`, `ss-audit`, `ss-score`, `ss-verify`, `ss-update`, or
`ss-learn`, use that direct skill instead of rerouting.
