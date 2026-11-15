// Select the catalog rules that apply to one artifact and render them as a bundle section.
// Pure: no I/O. Invariants always apply; a default applies when every non-empty scope list
// intersects the selection. Order is deterministic (priority, then id) so bundles stay stable.
// Project decisions from the ledger render above the invariants; with no applicable decision the
// section is byte-identical to a project without a ledger.
const PRIORITY_RANK = { blocks: 0, strong: 1, advisory: 2 };

export function ruleApplies(rule, selection = {}) {
  if (rule.kind === "invariant") return true;
  const scope = rule.scope ?? {};
  const match = (list, value) => !Array.isArray(list) || list.length === 0 || (value != null && list.includes(value));
  return match(scope.grammars, selection.grammar)
    && match(scope.adapters, selection.adapter)
    && match(scope.domains, selection.domain)
    && match(scope.pageTypes, selection.page);
}

export function selectRules(rules = [], selection = {}) {
  const sort = (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) || a.id.localeCompare(b.id);
  const applicable = rules.filter((rule) => ruleApplies(rule, selection));
  return {
    invariants: applicable.filter((rule) => rule.kind === "invariant").sort(sort),
    defaults: applicable.filter((rule) => rule.kind !== "invariant").sort(sort),
  };
}

function scopeLabel(rule) {
  const parts = Object.entries(rule.scope ?? {}).filter(([, list]) => Array.isArray(list) && list.length).map(([field, list]) => `${field}: ${list.join("/")}`);
  return parts.length ? parts.join(" · ") : "any selection";
}

function renderRule(rule, exceptionIds = []) {
  const bits = [`- **${rule.id}** (${rule.priority} · ${rule.evidence?.level ?? "unknown"}`];
  if (rule.kind !== "invariant") bits.push(` · ${scopeLabel(rule)}`);
  bits.push(`): ${rule.statement}`);
  if (rule.exceptions?.length) bits.push(` Exceptions: ${rule.exceptions.join("; ")}.`);
  const checks = [...(rule.check?.detectors ?? []), ...(rule.check?.tool ? [rule.check.tool] : [])];
  if (checks.length) bits.push(` Checks: ${checks.join(", ")}.`);
  bits.push(` Source: ${rule.source}`);
  if (exceptionIds.length) bits.push(` Project ${exceptionIds.length === 1 ? "exception" : "exceptions"}: ${exceptionIds.join(", ")}.`);
  return bits.join("");
}

// Ledger entries from `.styleseed/project.json` `decisions` that apply to one artifact: entries
// without `scope.artifacts` apply to every artifact. Input is the normalized ledger (sorted by id).
export function decisionsFor(decisions = [], artifactId = null) {
  return decisions.filter((entry) => !Array.isArray(entry.scope?.artifacts) || entry.scope.artifacts.includes(artifactId));
}

function renderDecision(entry) {
  const kind = entry.kind === "exception"
    ? `exception to ${[entry.to, entry.rule].filter(Boolean).join(", ")}`
    : `decision${entry.rule ? ` for ${entry.rule}` : ""}`;
  const parts = [kind];
  if (entry.axis) parts.push(`${entry.axis} ${entry.kind === "exception" ? "+" : "="} ${entry.values.join(", ")}`);
  if (entry.scope?.screens?.length) parts.push(`screens: ${entry.scope.screens.join(", ")}`);
  parts.push(`approved by ${entry.approvedBy}, ${entry.date}`);
  return `- **${entry.id}** (${parts.join(" · ")}): ${entry.statement}`;
}

// `ledgerPath` is where the entries are recorded: `.styleseed/project.json` for a registry, the array in
// `.styleseed/decisions.json` for a project without one.
export function renderRulesSection(rules, selection = {}, { decisions = [], artifactId = null, ledgerPath = ".styleseed/project.json" } = {}) {
  const { invariants, defaults } = selectRules(rules, selection);
  const applicable = decisionsFor(decisions, artifactId);
  if (!invariants.length && !defaults.length && !applicable.length) return "";
  const exceptionsByRule = new Map();
  for (const entry of applicable) if (entry.kind === "exception" && entry.rule) exceptionsByRule.set(entry.rule, [...(exceptionsByRule.get(entry.rule) ?? []), entry.id]);
  const where = [selection.grammar && `grammar ${selection.grammar}`, selection.adapter && `adapter ${selection.adapter}`, selection.domain && `domain ${selection.domain}`, selection.page && `page ${selection.page}`].filter(Boolean).join(" · ");
  return [
    "# Rules in scope",
    "",
    `Compiled from \`engine/rules/catalog.json\` for ${where || "this selection"}. Invariants bind everywhere; defaults apply to this selection and yield to a recorded project decision. Each line carries its id for checks and reviews; \`blocks\` is a fail state independent of any score.`,
    "",
    ...(applicable.length ? [
      "## Project decisions",
      "",
      `Recorded in \`${ledgerPath}\`. A decision outranks a default; it never outranks an invariant.`,
      "",
      ...applicable.map(renderDecision),
      "",
    ] : []),
    "## Invariants",
    "",
    ...(invariants.length ? invariants.map((rule) => renderRule(rule)) : ["- none"]),
    "",
    "## Defaults for this selection",
    "",
    ...(defaults.length ? defaults.map((rule) => renderRule(rule, exceptionsByRule.get(rule.id))) : ["- none"]),
  ].join("\n");
}
