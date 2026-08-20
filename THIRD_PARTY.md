# Third-party components

StyleSeed's core distribution (the `styleseed` router and the `ss-*` skills) ships **no runtime
dependencies**: it is rule canon plus dependency-free Node scripts. The components below are the
direct third-party open-source packages this repository uses to build, verify, and document that
core — the same list submitted as the SBOM attachment of the 2026 Open Source Developer Contest
result report.

Versions are the versions actually installed at the time of writing (2026-08-19), not range
specifiers. Transitive dependencies are not listed; see `demo-pricing/package.json` and the
repository lockfile for the complete graph.

| # | Component | Version | License | Repository | Purpose / how it is linked |
|---|---|---|---|---|---|
| 1 | Playwright | 1.59.1 | Apache-2.0 | https://github.com/microsoft/playwright | Render and recording evidence capture for the pixel/temporal gates — imported as a library |
| 2 | React | 19.2.4 | MIT | https://github.com/facebook/react | UI rendering of the surfaces under verification — imported as a library |
| 3 | Next.js | 16.2.3 | MIT | https://github.com/vercel/next.js | Builds the docs/demo site and the dogfooded artifacts — used as a framework |
| 4 | Tailwind CSS | 4.2.2 | MIT | https://github.com/tailwindlabs/tailwindcss | Maps design tokens to utility CSS — part of the build pipeline |
| 5 | framer-motion (motion) | 12.38.0 | MIT | https://github.com/motiondivision/motion | Motion seed implementations graded by the temporal gate — imported as a library |
| 6 | @radix-ui/react-* (18 packages) | 1.1.8–2.2.6 | MIT | https://github.com/radix-ui/primitives | Accessible UI primitives (dialog, tabs, tooltip, …) — imported as libraries |
| 7 | TypeScript | 5.9.3 | Apache-2.0 | https://github.com/microsoft/TypeScript | Token and skill-contract types, build-time checking — build tool |
| 8 | class-variance-authority | 0.7.1 | Apache-2.0 | https://github.com/joe-bell/cva | Expresses component variant rules — imported as a library |
| 9 | lucide-react | 1.8.0 | ISC | https://github.com/lucide-icons/lucide | Icon set — imported as a library |
| 10 | Node.js | 24.13.0 | MIT | https://github.com/nodejs/node | Runtime for engine validation, packaging, and test scripts — execution environment |

No GPL, LGPL, or AGPL components are used. StyleSeed itself is released under the MIT License
(see `LICENSE`).

## AI models

StyleSeed embeds **no AI model weights and makes no commercial model API calls**. It is a
plugin/skill layer that a coding agent (Claude Code, Codex CLI, Cursor) executes; the host supplies
the model. Commercial AI assistants were used as coding aids during development, which is disclosed
in the contest result report's development-environment section.
