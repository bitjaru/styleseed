import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, symlinkSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { prepareManagedInstructions } from "../write-managed-instructions.mjs";

function root(prefix) { return mkdtempSync(join(tmpdir(), prefix)); }

test("managed instruction writer is dry-run by default and preserves outside text", () => {
  const projectRoot = root("styleseed-managed-");
  try {
    const path = resolve(projectRoot, "AGENTS.md");
    writeFileSync(path, "project-owned instructions\n");
    const dry = prepareManagedInstructions({ projectRoot, file: "AGENTS.md" });
    assert.equal(dry.mode, "dry-run");
    assert.equal(readFileSync(path, "utf8"), "project-owned instructions\n");
    const written = prepareManagedInstructions({ projectRoot, file: "AGENTS.md", write: true });
    assert.equal(written.mode, "write");
    assert.match(readFileSync(path, "utf8"), /^project-owned instructions/m);
    assert.equal((readFileSync(path, "utf8").match(/STYLESEED:MANAGED:BEGIN/g) ?? []).length, 1);
    assert.equal(prepareManagedInstructions({ projectRoot, file: "AGENTS.md", write: true }).targets[0].changed, false);
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

test("managed instruction writer refuses symlinks and conflicting blocks", () => {
  const projectRoot = root("styleseed-managed-unsafe-");
  try {
    writeFileSync(resolve(projectRoot, "real.md"), "owned\n");
    symlinkSync(resolve(projectRoot, "real.md"), resolve(projectRoot, "AGENTS.md"));
    assert.throws(() => prepareManagedInstructions({ projectRoot, file: "AGENTS.md", write: true }), /symlink|hardlink|non-file/u);
    unlinkSafe(projectRoot, "AGENTS.md");
    writeFileSync(resolve(projectRoot, "AGENTS.md"), "<!-- STYLESEED:MANAGED:BEGIN -->\n<!-- STYLESEED:MANAGED:BEGIN -->\n");
    assert.throws(() => prepareManagedInstructions({ projectRoot, file: "AGENTS.md" }), /conflicting|multiple/u);
  } finally { rmSync(projectRoot, { recursive: true, force: true }); }
});

function unlinkSafe(projectRoot, file) {
  rmSync(resolve(projectRoot, file), { force: true });
}

