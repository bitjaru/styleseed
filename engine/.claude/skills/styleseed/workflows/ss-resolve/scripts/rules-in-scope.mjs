// Select the catalog rules that apply to one artifact and render them as a bundle section.
// Pure: no I/O. Invariants always apply; a default applies when every non-empty scope list
// intersects the selection. Order is deterministic (priority, then id) so bundles stay stable.
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

function renderRule(rule) {
  const bits = [`- **${rule.id}** (${rule.priority} · ${rule.evidence?.level ?? "unknown"}`];
  if (rule.kind !== "invariant") bits.push(` · ${scopeLabel(rule)}`);
  bits.push(`): ${rule.statement}`);
  if (rule.exceptions?.length) bits.push(` Exceptions: ${rule.exceptions.join("; ")}.`);
  if (rule.check?.detectors?.length) bits.push(` Checks: ${rule.check.detectors.join(", ")}.`);
  bits.push(` Source: ${rule.source}`);
  return bits.join("");
}

export function renderRulesSection(rules, selection = {}) {
  const { invariants, defaults } = selectRules(rules, selection);
  if (!invariants.length && !defaults.length) return "";
  const where = [selection.grammar && `grammar ${selection.grammar}`, selection.adapter && `adapter ${selection.adapter}`, selection.domain && `domain ${selection.domain}`, selection.page && `page ${selection.page}`].filter(Boolean).join(" · ");
  return [
    "# Rules in scope",
    "",
    `Compiled from \`engine/rules/catalog.json\` for ${where || "this selection"}. Invariants bind everywhere; defaults apply to this selection and yield to a recorded project decision. Each line carries its id for checks and reviews; \`blocks\` is a fail state independent of any score.`,
    "",
    "## Invariants",
    "",
    ...(invariants.length ? invariants.map(renderRule) : ["- none"]),
    "",
    "## Defaults for this selection",
    "",
    ...(defaults.length ? defaults.map(renderRule) : ["- none"]),
  ].join("\n");
}
