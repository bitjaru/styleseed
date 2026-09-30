import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const catalogPath = resolve(dirname(fileURLToPath(import.meta.url)), "../references/catalog.json");
// A damaged installation must still let doctor import this analyzer and report
// distribution failure. Keep analysis itself free of filesystem reads.
let defaultCatalog;
try { defaultCatalog = JSON.parse(readFileSync(catalogPath, "utf8")); }
catch { defaultCatalog = null; }
const simpleFontList = /^[\p{L}\p{N} .,'-]+(?:,\s*[\p{L}\p{N} .'-]+)*$/u;

function normalizeField(label, rawValue, catalog) {
  const trimmed = rawValue.trim();
  const value = /^`[^`]+`$/u.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
  if (label === "Typography") {
    return simpleFontList.test(value) && value.length <= 80 && !/\b(?:with|fallback|for|at|only|and)\b/iu.test(value)
      ? { normalizedLabel: "Font", normalizedValue: value, supported: true }
      : { normalizedLabel: "Font", normalizedValue: null, supported: false };
  }
  if (label === "Domain") {
    return Object.hasOwn(catalog.domains, value)
      ? { normalizedLabel: "App domain", normalizedValue: value, supported: true }
      : { normalizedLabel: "App domain", normalizedValue: null, supported: false };
  }
  return { normalizedLabel: label, normalizedValue: value, supported: true };
}

export function analyzeLegacyLock(text, { catalog = defaultCatalog } = {}) {
  if (typeof text !== "string") throw new Error("Legacy lock must be text");
  if (!catalog?.domains) throw new Error("Legacy analyzer catalog is unavailable or invalid");
  const sections = [{ id: "root", headingPath: [], startLine: 1 }];
  const fields = [];
  const headingStack = [];
  let sectionId = "root";
  let fence = null;
  for (const [index, line] of text.split(/\r?\n/u).entries()) {
    const lineNumber = index + 1;
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/u)?.[1];
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^\s{0,3}(#{2,6})\s+(.+?)\s*#*\s*$/u);
    if (heading) {
      const level = heading[1].length;
      while (headingStack.length && headingStack.at(-1).level >= level) headingStack.pop();
      headingStack.push({ level, title: heading[2] });
      sectionId = `s-${lineNumber}`;
      sections.push({ id: sectionId, headingPath: headingStack.map((item) => item.title), startLine: lineNumber });
      continue;
    }
    const match = line.match(/^\s*-\s+([^:]+):\s*(.+?)\s*$/u);
    if (!match) continue;
    const label = match[1].trim();
    const rawValue = match[2].trim();
    fields.push({ sectionId, line: lineNumber, label, rawValue, ...normalizeField(label, rawValue, catalog) });
  }
  const candidates = sections.filter((section) => fields.some((field) => field.sectionId === section.id && ["Output grammar", "Surface adapter"].includes(field.normalizedLabel))).map((section) => section.id);
  const surfaceCandidates = candidates.length > 1 && candidates.includes("root") && !fields.some((field) => field.sectionId === "root" && field.normalizedLabel === "Output grammar")
    ? candidates.filter((id) => id !== "root") : candidates;
  const groups = new Map();
  for (const field of fields) {
    const group = groups.get(field.normalizedLabel) ?? [];
    group.push(field);
    groups.set(field.normalizedLabel, group);
  }
  const duplicateGroups = [...groups.entries()].filter(([, entries]) => entries.length > 1).map(([field, entries]) => ({
    field,
    lines: entries.map((entry) => entry.line),
    kind: entries.every((entry) => entry.normalizedValue !== null && entry.normalizedValue === entries[0].normalizedValue) ? "same-value" : "conflicting-value",
  }));
  return { sections, fields, surfaceCandidates, duplicateGroups };
}
