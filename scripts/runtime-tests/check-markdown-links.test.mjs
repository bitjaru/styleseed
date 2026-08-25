import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkMarkdownLinks } from "../check-markdown-links.mjs";

function root(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

test("markdown link checker accepts valid local targets, including query strings, fragments, and root-relative links", () => {
  const projectRoot = root("styleseed-links-valid-");
  try {
    mkdirSync(join(projectRoot, "docs"), { recursive: true });
    writeFileSync(join(projectRoot, "docs", "target.md"), "# Target\n");
    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "[valid](docs/target.md)",
        "[query](docs/target.md?foo=bar)",
        "[fragment](docs/target.md#section)",
        "[root relative](/docs/target.md)",
      ].join("\n"),
    );
    assert.deepEqual(checkMarkdownLinks(projectRoot), []);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker reports missing local targets with source and line, including ones that merely start with '..'", () => {
  const projectRoot = root("styleseed-links-missing-");
  try {
    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "# Example",
        "",
        "[missing](docs/does-not-exist.md)",
        "[dotdot prefix](..missing.md)",
      ].join("\n"),
    );

    const errors = checkMarkdownLinks(projectRoot);

    assert.equal(errors.length, 2);
    assert.equal(errors[0].file, "README.md");
    assert.equal(errors[0].line, 3);
    assert.equal(errors[0].target, "docs/does-not-exist.md");
    assert.equal(errors[1].line, 4);
    assert.equal(errors[1].target, "..missing.md");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker ignores non-local targets: http(s), mailto, other URI schemes, network-path references, and anchors", () => {
  const projectRoot = root("styleseed-links-nonlocal-");
  try {
    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "[GitHub](https://github.com/example/project)",
        "[HTTP](http://example.com)",
        "[Email](mailto:test@example.com)",
        "[FTP](ftp://example.com/file.md)",
        "[Network path](//cdn.example.com/image.png)",
        "[Anchor](#section)",
      ].join("\n"),
    );
    assert.deepEqual(checkMarkdownLinks(projectRoot), []);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker ignores links inside fenced code blocks, respecting fence length for nested examples", () => {
  const projectRoot = root("styleseed-links-fenced-");
  try {
    mkdirSync(join(projectRoot, "docs"), { recursive: true });
    writeFileSync(join(projectRoot, "docs", "target.md"), "# Target\n");
    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "```md",
        "[missing](docs/does-not-exist.md)",
        "```",
        "",
        "[valid](docs/target.md)",
        "",
        "Here's how to write a broken link example in your docs:",
        "",
        "````md",
        "```",
        "[nested example](docs/also-does-not-exist.md)",
        "```",
        "````",
      ].join("\n"),
    );
    assert.deepEqual(checkMarkdownLinks(projectRoot), []);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker ignores targets outside the repository", () => {
  const projectRoot = root("styleseed-links-outside-");
  try {
    writeFileSync(join(projectRoot, "README.md"), "[Wiki](../../wiki)\n");
    assert.deepEqual(checkMarkdownLinks(projectRoot), []);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker does not crash on malformed percent-encoding in a target", () => {
  const projectRoot = root("styleseed-links-percent-");
  try {
    writeFileSync(
      join(projectRoot, "README.md"),
      "[Sale docs](50%-off-sale.md)\n",
    );
    const errors = checkMarkdownLinks(projectRoot);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, "README.md");
    assert.equal(errors[0].line, 1);
    assert.equal(errors[0].target, "50%-off-sale.md");
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});
