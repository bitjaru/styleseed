import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkMarkdownLinks } from "../check-markdown-links.mjs";

function root(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

test("markdown link checker accepts valid local targets", () => {
  const projectRoot = root("styleseed-links-valid-");

  try {
    mkdirSync(join(projectRoot, "docs"), { recursive: true });

    writeFileSync(
      join(projectRoot, "docs", "target.md"),
      "# Target\n"
    );

    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "[valid](docs/target.md)",
        "[query](docs/target.md?foo=bar)",
        "[fragment](docs/target.md#section)",
      ].join("\n")
    );

    assert.deepEqual(
      checkMarkdownLinks(projectRoot),
      []
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker reports missing targets with source and line", () => {
  const projectRoot = root("styleseed-links-missing-");

  try {
    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "# Example",
        "",
        "[missing](docs/does-not-exist.md)",
      ].join("\n")
    );

    const errors = checkMarkdownLinks(projectRoot);

    assert.equal(errors.length, 1);
    assert.equal(errors[0].file, "README.md");
    assert.equal(errors[0].line, 3);
    assert.equal(
      errors[0].target,
      "docs/does-not-exist.md"
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker ignores external URLs and anchors", () => {
  const projectRoot = root("styleseed-links-external-");

  try {
    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "[GitHub](https://github.com/example/project)",
        "[HTTP](http://example.com)",
        "[Email](mailto:test@example.com)",
        "[Anchor](#section)",
      ].join("\n")
    );

    assert.deepEqual(
      checkMarkdownLinks(projectRoot),
      []
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker ignores links inside fenced code blocks", () => {
  const projectRoot = root("styleseed-links-fenced-");

  try {
    mkdirSync(join(projectRoot, "docs"), { recursive: true });

    writeFileSync(
      join(projectRoot, "docs", "target.md"),
      "# Target\n"
    );

    writeFileSync(
      join(projectRoot, "README.md"),
      [
        "```md",
        "[missing](docs/does-not-exist.md)",
        "```",
        "",
        "[valid](docs/target.md)",
      ].join("\n")
    );

    assert.deepEqual(
      checkMarkdownLinks(projectRoot),
      []
    );
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});

test("markdown link checker ignores targets outside the repository", () => {
  const projectRoot = root("styleseed-links-outside-");

  try {
    writeFileSync(
      join(projectRoot, "README.md"),
      "[Wiki](../../wiki)\n"
    );

    assert.deepEqual(checkMarkdownLinks(projectRoot), []);
  } finally {
    rmSync(projectRoot, { recursive: true, force: true });
  }
});