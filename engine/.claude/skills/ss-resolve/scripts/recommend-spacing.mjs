#!/usr/bin/env node
import { resolve } from "node:path";
import { loadProjectRegistry } from "./project-registry.mjs";
import { defaultCatalog } from "./compiler.mjs";
import { recommendSpacing } from "./spacing-contract.mjs";
try {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "--help") {
    console.log("recommend-spacing.mjs --project-root <path> --artifact <id> (read-only JSON proposal)");
  } else {
    const options = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i];
      if (!["--project-root", "--artifact"].includes(key) || !args[i + 1] || args[i + 1].startsWith("--") || Object.hasOwn(options, key)) throw new Error("Expected unique --project-root and --artifact options");
      options[key] = args[i + 1];
    }
    if (!options["--artifact"]) throw new Error("--artifact is required");
    const registry = loadProjectRegistry(resolve(options["--project-root"] ?? "."), { catalog: defaultCatalog });
    if (!registry) throw new Error("Spacing proposals require a registry; legacy locks are not migrated automatically");
    const entry = registry.artifactMap.get(options["--artifact"]);
    if (!entry) throw new Error("Unknown artifact");
    console.log(JSON.stringify({ artifactId: entry.id, ...recommendSpacing(registry.project, entry.artifact) }, null, 2));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
