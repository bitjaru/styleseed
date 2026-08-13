# Security Policy

## Reporting a Vulnerability

StyleSeed includes executable CLI scripts, local file reads and writes, plugin
manifests, generated artifacts, optional model-exposure paths, and third-party
dependencies. If you find a security issue in any of those boundaries, we'd
like to hear about it.

**Please report privately** to **bitjaru0402@naver.com** rather than opening a
public issue. Include:

- A description of the issue and where it is (file/component)
- Steps to reproduce, if applicable
- The version / commit you found it on

We aim to acknowledge reports within a few days and will credit you (if you
want) once a fix ships.

## Supported Versions

Supported versions are published tags or published artifacts, plus separately
identified security fixes. `main` is not an immutable release by itself.

## Scope

In scope:

- executable CLI and local automation under `engine/.claude/skills/**` and `scripts/**`
- local files written or read by manifests, generated bundles, evidence files, and learning records
- plugin/package boundaries, including plugin manifests and MCP exposure contracts
- model-exposure boundaries where a local package may become visible to a connected client/model
- path, symlink, traversal, containment, dependency, and supply-chain issues in maintained distributions

Out of scope:

- third-party deployments that add their own infrastructure, secrets, or wrappers
- downstream projects that copied or modified the engine and no longer match a published artifact
- unverifiable claims about a local install without a reproducible artifact or exact file evidence

## Current boundaries

- The implemented default/core install contains no learning MCP.
- Known high-risk identity patterns are blocked in local learning; this is a guardrail, not an anonymization guarantee.
- A prepared learning package is local and untransmitted unless a future optional bridge is separately implemented and verified.
