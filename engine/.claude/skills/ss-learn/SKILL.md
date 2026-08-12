---
name: ss-learn
description: Capture a human-approved UI design lesson as a privacy-minimized local StyleSeed candidate, review it, and prepare an opt-in share package without transmitting project code, prompts, screenshots, or brand data. Use when a person asks StyleSeed to remember, learn from, generalize, review, or prepare a reusable rule from an accepted design correction.
---

# Learn from project design decisions

`ss-learn` turns a **specific human-approved correction** into a generalized candidate rule. It
does not train a model, scrape a repository, or upload telemetry. The v1 implementation is local
only; sharing stops at a reviewed package on disk.

Read `references/privacy-contract.md` before using this skill.

## When not to use

- The user did not explicitly ask to capture or share a lesson.
- The change was accepted only by the agent, not a person.
- The lesson cannot be expressed without client/product identity, source code, a screenshot,
  proprietary tokens, or user content.
- A score or visual pass was not actually measured. Record it as `null` or `not-run`; never infer.
- The observation belongs only to one project's taste. Keep it in `STYLESEED.md` instead.

## 1. Initialize local learning

After explicit user approval:

```bash
node <installed-ss-learn>/scripts/learning.mjs init --project-root .
```

This creates `.styleseed/learning/config.json` with sharing disabled and all raw-material
collection disabled. It performs no network request.

## 2. Draft a candidate

Use `references/candidate.schema.json`. Generalize the lesson:

- problem: what design failure was observed;
- intervention: what bounded change the person accepted;
- rationale: why it improved the product job;
- appliesWhen: conditions where the judgment should transfer;
- avoidWhen: counterexamples and failure boundaries;
- evidence: only measured scores, verification status, and optional SHA-256 artifact hashes.

Do not include project names, URLs, paths, emails, source snippets, prompts, screenshots, colors,
font names, or component names. Then capture it:

```bash
node <installed-ss-learn>/scripts/learning.mjs capture \
  --project-root . \
  --input /path/to/candidate.json
```

The CLI validates maintained context IDs, exact fields, privacy patterns, and evidence honesty.
It writes an immutable draft ID under `.styleseed/learning/candidates/`.

## 3. Human review

Show the full candidate to the user. Only after their explicit accept/reject decision run:

```bash
node <installed-ss-learn>/scripts/learning.mjs review \
  --project-root . \
  --id <candidate-id> \
  --decision accepted \
  --reviewer <local-alias> \
  --reason "<why this generalizes>" \
  --attestation APPROVE_LOCAL_REVIEW
```

Use `--decision rejected` for a counterexample. Never accept on the user's behalf. A candidate is
content-addressed and receives one final local decision; revise the source lesson and capture a new
candidate instead of rewriting an accepted or rejected record.

## 4. Prepare an opt-in share package

Only an accepted candidate can be packaged. Show the sanitized payload and ask separately whether
the user approves export for `team-registry` or `community-candidate`:

```bash
node <installed-ss-learn>/scripts/learning.mjs prepare-share \
  --project-root . \
  --id <candidate-id> \
  --purpose team-registry \
  --attestation APPROVE_LOCAL_EXPORT
```

This writes `.styleseed/learning/share/<id>.<purpose>.json`. It strips reviewer identity and local
paths, binds the payload to the engine revision, and records a content hash. It does **not** send
the file anywhere.

## 5. Promotion boundary

A share package is evidence, not a StyleSeed rule. Central or team promotion requires multiple
independent projects, counterexamples, accessibility and grammar regression checks, benchmark
evidence, and named maintainer approval. Never edit core rules automatically from local learning.

## Completion report

Report separately:

- local candidate: captured | not captured;
- human review: accepted | rejected | pending;
- visual evidence: verified | failed | not run;
- share package: prepared locally | not prepared;
- external transmission: always `not performed` in v1.
