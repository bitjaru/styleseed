---
name: ss-audit
description: Audit screens for UX issues using Nielsen's heuristics and modern mobile UX best practices
argument-hint: "[file-path or screen-name]"
allowed-tools: Read, Grep, Glob
---

Before this workflow, follow the once-per-session [update preflight](../ss-update/references/update-preflight.md).


# UX Audit
## Registry-first artifact boundary

When `.styleseed/project.json` and `.styleseed/artifacts/index.json` exist, resolve the requested artifact ID first, then read only `.styleseed/bundles/<artifact-id>.md` and `.styleseed/manifests/<artifact-id>.json`. Never fall back to the global legacy bundle for a registry project. Legacy projects may use `.styleseed/effective-rules.md` only when no registry exists.

## When NOT to use

- For accessibility-only issues → use `/ss-a11y`
- For design system token/golden-rule compliance → use `/ss-review`
- For copy/microcopy quality → use `/ss-copy`
- For brand new screens that don't exist yet — design first with `/ss-page` or `/ss-flow`

Target: **$ARGUMENTS**

## Scope and findings

Inspect and recommend within the user's request. Read the compiled task and approved choices
before using the checklist. Mark inapplicable checks N/A with a reason. Nielsen's heuristics
are questions about usability; example widgets, palette conventions, and platform gestures
are not universal requirements.

Use the [observation and critique procedure](../ss-verify/references/applied-checks.md#observe-before-reconciling)
when rendered evidence is available. Record the user's job and what the screen communicates
before reconciling automatic warnings. If you only read source, label visual judgments unverified.
Do not invent a rendered observation or turn a normal comparison grid into a hierarchy failure.

## Audit Framework

### Nielsen's 10 Usability Heuristics

#### 1. Visibility of System Status
- [ ] Loading feedback suits the wait and known content shape; preserve orientation
- [ ] Success/error feedback appears where the user needs it; inline or toast as appropriate
- [ ] Progress indicators for multi-step flows
- [ ] Active state clearly shown on navigation items
- [ ] Real-time data has timestamp showing freshness

#### 2. Match Between System and Real World
- [ ] Labels use user's language, not technical jargon
- [ ] Critical icons use the approved family and have understandable labels
- [ ] Number formats match user expectations (comma separators, currency symbols)
- [ ] Date formats are locale-appropriate

#### 3. User Control and Freedom
- [ ] Back navigation available on all non-root screens
- [ ] Destructive actions have confirmation dialogs
- [ ] Undo available for reversible actions (toast with undo)
- [ ] Bottom sheet/modal can be dismissed (backdrop tap, swipe down, X button)
- [ ] No dark patterns (no forced actions, always a way to dismiss)

#### 4. Consistency and Standards
- [ ] Same action = same appearance everywhere
- [ ] Color meanings are stable in the product and accompanied by non-color cues
- [ ] Text roles follow the approved system; contrast, weight, position, and size support reading
- [ ] Surface treatment follows the resolved grammar and brand recipe
- [ ] Spacing follows the resolved token scale and adapter constraints

#### 5. Error Prevention
- [ ] Destructive buttons are visually distinct (destructive variant)
- [ ] Validation timing supports recovery; avoid premature errors and retain entered data
- [ ] Dangerous actions require explicit confirmation
- [ ] Input constraints are visible before errors occur (character limits, format hints)

#### 6. Recognition Rather Than Recall
- [ ] Icon controls have accessible labels; navigation labels follow the selected adapter
- [ ] Current state visible without memorization (active tab highlighted)
- [ ] Recent/frequent items shown for quick access
- [ ] Placeholder text shows expected format

#### 7. Flexibility and Efficiency
- [ ] Key actions are reachable through an appropriate product-specific path
- [ ] Refresh behavior follows the platform adapter and the product's data semantics
- [ ] Touch hit areas >= 44x44px; pointer-first controls follow the resolved contract (approved 36–40px controls are not touch failures)
- [ ] Frequently used actions are placed according to the resolved navigation adapter

#### 8. Aesthetic and Minimalist Design
- [ ] The reading, decision, or monitoring task and its relevant regions are identifiable
- [ ] No decorative elements that don't serve a purpose
- [ ] Priority is conveyed through task-appropriate position, grouping, contrast, type, and scale
- [ ] Card and collection density follows the resolved grammar and task complexity
- [ ] Emphasis supports the task; equivalent comparison or monitoring regions may share weight

#### 9. Help Users Recover from Errors
- [ ] Error messages explain what went wrong in plain language
- [ ] Error messages suggest how to fix the problem
- [ ] Partial failures don't break the whole page (one card fails, others load)
- [ ] Network errors show retry button
- [ ] Form errors highlight the specific field

#### 10. Help and Documentation
- [ ] Empty states guide users to take action
- [ ] Onboarding for first-time features (if applicable)
- [ ] Tooltips for complex metrics (if applicable)

### Mobile-Specific UX Checks

#### Touch & Gesture
- [ ] On touch surfaces, hit areas minimum 44x44px; preserve applicable accessibility floors for every input mode
- [ ] Minimum 8px between adjacent touch targets
- [ ] No hover-dependent interactions (mobile has no hover)
- [ ] Swipe gestures have visible affordances (carousel indicators)

#### Performance Perception
- [ ] Loading feedback matches expected latency without flashing or delaying available content
- [ ] Optimistic updates are used only when safe, with visible recovery on failure
- [ ] Above-the-fold content loads first
- [ ] No layout shift after content loads

#### Safe Areas
- [ ] Content not hidden behind notch/Dynamic Island
- [ ] Bottom content not behind home indicator
- [ ] Navigation surfaces respect the platform safe-area contract when one applies

### Dark Pattern Prevention
- [ ] No forced bottom sheets on entry
- [ ] No exit-prevention dialogs
- [ ] Every screen has a way to go back/dismiss
- [ ] CTA labels clearly describe the action
- [ ] No manipulative graphics (begging, urgency)

## Output Format

1. **Task and evidence**: artifact, approved choices, source/rendered states and unchecked scope.
2. **Findings**: observed behavior → task impact → applicable contract, with a location or render ID.
3. **Severity**: functional/accessibility failure, contract drift, or optional design suggestion.
4. **Repair**: smallest in-scope change, decisions to preserve, and the state to recheck.
5. **Unresolved**: conflicting evidence, N/A reasons, unsupported checks, and human decisions.

An aggregate grade is optional and cannot replace the findings or imply human acceptance.
