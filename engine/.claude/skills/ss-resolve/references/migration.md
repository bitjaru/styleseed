# Review a legacy lock before registry migration

Use this only for a requested migration. Diagnosis is read-only. The migration preserves the
legacy lock and never overwrites an existing registry. A valid JSON plan is not evidence that
the person's design intent survived; show the proposed settings and obtain review before applying.

1. Run `node <ss-resolve>/scripts/migrate-project.mjs --project-root . --dry-run`.
   `review-required` means a draft exists, not a completed migration. Inspect the line-numbered
   sections, unknown values, conflicts, and `unresolvedCriticalFields`.
2. Prepare a project-local JSON plan with exactly these fields:

   ```json
   {
     "schemaVersion": 1,
     "legacyLockSha256": "sha256:<hash from the current dry-run>",
     "sectionMapping": [{ "sectionId": "root", "artifactId": "default" }],
     "project": {},
     "artifacts": [],
     "acknowledgedUnmigratedFields": []
   }
   ```

   This is a shape illustration, not an applicable plan. Fill `project` and `artifacts` with
   complete, reviewed configurations using the dry-run's `targets[].content` as drafts.
   Replace guessed viewport, target, implementation paths and placeholder decisions with actual
   project values. Source directories and token files must already exist. Preserve supported
   explicit colors, fonts, grammar, domain and adapter selections.
3. Map every reported `surfaceCandidates` section one-to-one to an artifact. For a lock without
   candidates use `root`. The section IDs come from the current analysis; do not invent them.
   Acknowledge every unresolved legacy line with its exact `{ "line": 4, "label": "...",
   "reason": "unknown" }` or `unsupported` entry. Acknowledgement records review, not automatic
   support for that setting. Distinct brands that cannot share the project contract need separate
   projects. The current contract cannot migrate an explicit companion color; retain the lock
   and resolve that unsupported choice before proceeding.
4. Run `node <ss-resolve>/scripts/migrate-project.mjs --project-root . --reviewed-plan migration-plan.json --dry-run`.
   Inspect the reported before/after settings and complete target contents with the person.
   `ready-for-confirmation` establishes structural validity only.
5. After that review, apply the exact reported hash:
   `node <ss-resolve>/scripts/migrate-project.mjs --project-root . --reviewed-plan migration-plan.json --confirm-plan sha256:<exact hash> --write`.
   If the source lock or plan changes, repeat preview and review. Bare `--write` intentionally
   refuses the old automatic-default behavior. There is no force/default-acceptance shortcut.
6. Resolve every migrated artifact, check its bundle, then build and verify within the requested
   task. Migration writes configuration only; it does not establish working UI or human acceptance.

Exit codes: dry-run success is 0, a bare write requiring review is 2, and invalid input/path/plan
or failed writes return 1. If a write fails, the tool removes only unchanged files it created and
reports any retained partial targets. Inspect those paths before retrying.
