# Verify a StyleSeed install on Windows PowerShell

This is a project-local verification path for the public core distribution. It does not install
the optional learning extension or a StyleSeed MCP server.

## Verified environment

The commands below were verified on 2026-08-25 with:

- Windows 10.0.19045.7663
- PowerShell 7.6.4
- Node.js 22.23.2
- npm / npx 10.9.8
- `skills` CLI 1.5.23
- Codex desktop 26.818.8289.0
- StyleSeed 4.1.0 at commit `f064c75`

## Clean project-local install

Open PowerShell in a disposable, non-sensitive parent directory. Create a clean workspace and
confirm the runtime versions:

```powershell
$workspace = Join-Path $PWD "styleseed-windows-check"
New-Item -ItemType Directory -Path $workspace | Out-Null
Set-Location $workspace

node --version
npx --version
$PSVersionTable | Select-Object PSVersion, PSEdition, Platform, OS
```

Expected version output starts with Node.js `v22` and identifies Windows (`Win32NT`). Then run the
public install command:

```powershell
npx skills add bitjaru/styleseed
```

When `npx` asks to install the `skills` package, review the displayed version and approve it. In the
verified Codex environment the installer reported:

```text
codex  Agent detected — installing non-interactively
Source: https://github.com/bitjaru/styleseed.git
Installed 23 skills
```

The result is project-local under `.agents\skills`; no administrator shell or global install is
required.

## Verify the core and router

Count and list the installed skills:

```powershell
$skillRoot = Join-Path $PWD ".agents\skills"
$skills = Get-ChildItem -LiteralPath $skillRoot -Directory

$skills.Count
$skills.Name | Sort-Object
```

Expected count:

```text
23
```

Confirm the `styleseed` router and installed StyleSeed version:

```powershell
$router = Join-Path $skillRoot "styleseed\SKILL.md"
Test-Path -LiteralPath $router
Get-Content -LiteralPath $router -TotalCount 4

$catalogPath = Join-Path $skillRoot "ss-resolve\references\catalog.json"
(Get-Content -Raw -LiteralPath $catalogPath | ConvertFrom-Json).engineVersion
```

Expected output includes:

```text
True
name: styleseed
4.1.0
```

For Codex discovery, start a fresh Codex session in this workspace, open `/skills`, and choose
`styleseed`, or invoke `$styleseed`. The installer detecting Codex and the router existing at
`.agents\skills\styleseed\SKILL.md` verify the host path. An already-running session may retain its
old skill index; needing a fresh session is a host refresh limitation, not an install failure.

## Confirm excluded components

The public core should not contain `ss-learn`, a StyleSeed MCP server, or a plugin package:

```powershell
Test-Path -LiteralPath (Join-Path $skillRoot "ss-learn")

Get-ChildItem -LiteralPath $PWD -Recurse -Force |
  Where-Object { $_.Name -match '(^ss-learn$|mcp|plugin\.json|\.codex-plugin)' } |
  Select-Object -ExpandProperty FullName
```

Expected output is `False` for `ss-learn` and no paths from the second command.

## Troubleshooting

- **The skill count is not 23:** confirm that the command ran in the intended empty workspace and
  that `$skillRoot` is `.agents\skills`. Remove or replace files only after reviewing them.
- **`styleseed` is missing from Codex:** confirm the router file exists, then start a fresh Codex
  session in the workspace. Discovery is session-scoped.
- **PowerShell blocks `npx.ps1`:** run `npx.cmd skills add bitjaru/styleseed`. This uses the same npm
  executable without changing the machine execution policy.
- **The clone or package download fails:** check GitHub and npm network access, then retry. A network
  or proxy failure is separate from StyleSeed core validation.
