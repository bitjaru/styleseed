# Studio artifact contract

Use these fields exactly. Extra task-specific fields are allowed, but required fields may not be
renamed.

## `run.json`

Registry-backed Studio runs are schema v2 and bind the current artifact:

```json
{
  "schemaVersion": 2,
  "id": "studio-run-id",
  "title": "project or concept",
  "stage": "briefed | directed | selected | planned | built | verified",
  "surface": "mobile-app",
  "platform": "web",
  "artifactId": "app-dashboard",
  "manifestPath": ".styleseed/manifests/app-dashboard.json",
  "methodHash": "sha256:...",
  "outputs": {
    "prototype": "/app-dashboard",
    "recording": ".styleseed/studio/studio-run-id/evidence/recordings/prototype.webm"
  }
}
```

`prototype` may be a route or local path. It is not evidence by itself. When temporal verification is
required, `outputs.recording` must be a local regular file whose hash is inventoried by the evidence
verifier.

## `references.json`

```json
{
  "items": [{
    "id": "R1",
    "role": "structure | navigation | signature | motion | asset-language",
    "source": "URL or path",
    "observedAt": "ISO-8601",
    "observation": "visible fact",
    "principle": "transferable decision",
    "confidence": "high | medium | low",
    "rights": "usage/provenance note"
  }]
}
```

## `directions.json`

`directions` contains exactly one `native`, one `signature`, and one `experimental` direction.

```json
{
  "directions": [{
    "id": "signature",
    "lane": "signature",
    "name": "user-facing name",
    "promise": "one-sentence product experience",
    "grammar": "built-in or reference grammar id",
    "recipe": "brand recipe id",
    "palette": "palette recipe id",
    "composition": "focal and spatial logic",
    "navigationChrome": "chrome/canvas relationship and states",
    "typeAndMaterial": "type, color, surface, and image material",
    "assetDirection": "what media is generated and why",
    "motionDirection": "continuity and feedback logic",
    "signatureMove": "one product-owned interaction",
    "tradeoffs": ["..."],
    "cost": "low | medium | high",
    "risk": "low | medium | high"
  }]
}
```

## `selection.json`

```json
{
  "selectedDirectionId": "signature",
  "decisionBy": "reviewer name",
  "decidedAt": "ISO-8601",
  "rationale": "why this direction fits the job"
}
```

## `scenes.json`

```json
{
  "scenes": [{
    "id": "open-focus",
    "trigger": "tap focus card",
    "from": "home-rest",
    "to": "focus-detail",
    "continuity": ["selected card", "title"],
    "enter": ["detail controls"],
    "exit": ["secondary feed"],
    "feedback": "selected card lifts into the content plane",
    "interrupt": "back or reverse gesture restores the source card",
    "reducedMotion": "instant state swap plus focus movement",
    "rendererTargets": ["web"]
  }]
}
```

## `assets.json`

```json
{
  "jobs": [{
    "id": "A1",
    "role": "ambient hero texture",
    "kind": "raster | vector | video | audio",
    "capability": "raster-generate",
    "provider": "provider/tool id or unassigned",
    "prompt": "complete reproducible prompt",
    "inputs": [],
    "output": "relative path or null",
    "status": "planned | running | complete | blocked | rejected",
    "provenance": "model/tool/date or pending",
    "rights": "client usage and source note",
    "fallback": "code-native or alternate media treatment",
    "consumingScene": "scene id"
  }]
}
```

## `video.json`

```json
{
  "mode": "prototype-first",
  "shots": [{
    "id": "V1",
    "sourceType": "prototype-recording | generated-media",
    "scene": "scene id",
    "durationMs": 2400,
    "source": "relative path or null",
    "status": "planned | complete | blocked",
    "notes": "camera, crop, caption, or compositing instruction"
  }]
}
```

## `verification.json`

```json
{
  "schemaVersion": 2,
  "evidenceRunId": "gate-run-id or null",
  "evidenceSummary": {
    "schemaVersion": 1,
    "status": "pass | fail",
    "gates": {
      "code": "pass | fail | blocked",
      "visual": "pass | fail | blocked",
      "temporal": "pass | fail | blocked",
      "human": "pass | fail | blocked"
    }
  },
  "risks": []
}
```

`studio-run.mjs evidence --run <studio-run-id> --evidence-run <gate-run-id>` stores only the computed
verifier summary. Manual `gate` updates may record `fail` or `blocked` progress notes, but only the
evidence verifier may derive `pass`.
