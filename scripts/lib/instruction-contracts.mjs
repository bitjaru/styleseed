// Static checks for demonstrated instruction contradictions, not an LLM behavior evaluator.
// These checks intentionally cover only the tested imperative/list forms. Passing them does
// not establish that every paraphrase, instruction combination, or model is safe.
function declaredTools(text) {
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/u)?.[1] ?? "";
  // Absent metadata means host defaults/unknown, not an empty tool allowlist.
  const match = frontmatter.match(/^allowed-tools:[ \t]*([^\r\n]*)/mu);
  if (!match) return null;
  let value = match[1].trim();
  if (!value) {
    const rest = frontmatter.slice(match.index + match[0].length);
    value = rest.match(/^(?:\r?\n[ \t]+-[ \t]+[^\r\n]*)+/u)?.[0] ?? "";
  }
  return new Set(value.replace(/[\[\]"']/gu, "").split(/[,\s]+/u).filter((tool) => tool && tool !== "-"));
}

function maskFences(text) {
  let fence = null;
  return text.split(/(?<=\n)/u).map((line) => {
    const marker = line.match(/^[ \t]*(`{3,}|~{3,})([^\r\n]*)/u);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = null;
      return line.replace(/[^\r\n]/gu, " ");
    }
    if (marker) {
      fence = marker[1];
      return line.replace(/[^\r\n]/gu, " ");
    }
    return line;
  }).join("");
}

export function inspectInstructionContracts(skills) {
  const findings = [];
  const toolsBySkill = new Map(Object.entries(skills).map(([name, text]) => [name, declaredTools(text)]));

  for (const [name, text] of Object.entries(skills)) {
    // Mask code examples while preserving source offsets/line numbers.
    const prose = maskFences(text);
    const report = (code, offset, message) => findings.push({
      skill: name, code, line: prose.slice(0, offset).split("\n").length, message,
    });
    if (prose.includes(".styleseed/artifacts/index.json")) {
      let legacySection = false;
      for (const paragraph of prose.matchAll(/[^\r\n]+(?:\r?\n(?![ \t]*\r?\n)[^\r\n]+)*/gu)) {
        const body = paragraph[0].replace(/\s+/gu, " ").trim();
        const legacyGuard = /(?:only when neither registry file exists|only (?:projects|when projects) without either registry file|legacy projects without a registry|only when no registry exists|only use [^.;]{1,80} when no registry exists)/iu.test(body);
        if (/^#{1,6}\s/u.test(body)) legacySection = false;
        // A qualified legacy branch may contain commands and follow-up prose before the
        // next heading. A trailing compatibility note in a registry paragraph does not
        // make the rest of the skill legacy-only.
        if (/^(?:Only|Legacy projects)\b/iu.test(body) && legacyGuard) legacySection = true;
        if (/^(?:If|When)\b.*\.styleseed\/(?:project|artifacts\/index)\.json/iu.test(body)) legacySection = false;
        const path = paragraph[0].indexOf("`.styleseed/effective-rules.md`");
        if (path >= 0 && /\bread\b/iu.test(body) && !legacyGuard && !legacySection) {
          report("SI001", paragraph.index + path,
            "Legacy bundle read inside a registry-aware skill without a tested legacy-only guard.");
        }
      }
    }
    const editingHandoffs = [
      /\buse\s+`[/$]?(ss-[a-z-]+)`\s+to\s+(?:fix|edit|make\s+the\s+edits)\b/giu,
      /\bwith\s+fixes\s*(?:→|->)\s*use\s+`[/$]?(ss-[a-z-]+)`/giu,
      /\bapply\s+(?:approved\s+)?fixes\s+(?:with|using)\s+`[/$]?(ss-[a-z-]+)`/giu,
    ];
    for (const pattern of editingHandoffs) for (const match of prose.matchAll(pattern)) {
      // Exclude directly negated instructions; this is not a general prose parser.
      if (/(?:do not|don't|never)\s*$/iu.test(prose.slice(0, match.index))) continue;
      const target = match[1];
      const targetTools = toolsBySkill.get(target);
      const readOnlyTools = new Set(["Read", "Grep", "Glob", "WebFetch", "WebSearch"]);
      if (targetTools && [...targetTools].every((tool) => readOnlyTools.has(tool))) {
        report("SI002", match.index,
          `Editing handoff to read-only skill ${target}; return findings to an authorized implementation step.`);
      }
    }
  }
  return findings.sort((a, b) => a.skill.localeCompare(b.skill) || a.line - b.line || a.code.localeCompare(b.code));
}
