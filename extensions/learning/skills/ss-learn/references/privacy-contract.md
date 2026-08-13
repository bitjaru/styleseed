# StyleSeed learning privacy contract

`ss-learn` records reusable design judgment, not project material.

## Allowed

- maintained StyleSeed context IDs;
- a generalized problem, intervention, rationale, applicability, and counterexamples;
- numeric before/after scores when actually measured;
- visual-verification status and content-addressed artifact hashes;
- the exact StyleSeed engine version and revision.

## Rejected by the local CLI

- source code, prompts, conversations, screenshots, generated assets, or raw file contents;
- repository, organization, product, client, or person identifiers;
- URLs, email addresses, absolute filesystem paths, secrets, tokens, or credentials;
- key colors, font names, brand tokens, proprietary component names, or protected assets;
- arbitrary extra fields outside the candidate schema.

The scanner is a guardrail, not a legal anonymization guarantee. A person must review every
candidate before accepting it and every share package before export.

## Sharing states

- `draft`: local candidate; not approved as a reusable lesson.
- `accepted`: a named local reviewer approved the generalized lesson.
- `rejected`: retained locally as a counterexample; never exportable.
- share package: a sanitized, content-addressed local file for one declared purpose. Creating it
  does not transmit it.
- MCP grant: a one-use receipt bound to the accepted candidate, review hash, purpose, and package
  hash. The bridge consumes it before returning the package to the MCP client/model.

The entire `.styleseed/learning/` directory is ignored by its own fail-closed `.gitignore` so a
normal project commit cannot publish candidates accidentally. Export requires a separate approved
workflow outside v1.

There is no network transport in the CLI or bundled MCP server. However, an MCP tool result is
visible to the connected client and may be sent to its model, so that exposure requires a separate
one-time grant and is reported explicitly. Team registries and community contribution must consume
a reviewed share package rather than scanning a project directly; the bundled bridge does not
submit to either destination.
