// Optional web spacing contract. Values are decisions, never a quality score.
export const SPACING_ROLES = Object.freeze({
  pageInset: "Outer horizontal inset; one container owns it",
  sectionGap: "Between independent page sections",
  groupGap: "Between related groups within a section",
  stackGap: "Between closely related vertical elements",
  inlineGap: "Between related inline controls or items",
  componentInset: "Inside a containing component",
});
const tokenPattern = /^var\(--[a-zA-Z][a-zA-Z0-9-]{0,63}\)$/;
function object(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error(`${label} contains unknown keys`);
}
function length(value, label) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 256) return value;
  if (typeof value === "string" && tokenPattern.test(value)) return value;
  throw new Error(`${label} must be 0-256 CSS px or var(--project-token)`);
}
export function normalizeSpacing(input, label = "spacing") {
  object(input, ["wideMinWidth", "roles"], label);
  if (input.wideMinWidth !== undefined && (!Number.isInteger(input.wideMinWidth) || input.wideMinWidth < 320 || input.wideMinWidth > 3840)) throw new Error(`${label}.wideMinWidth must be 320-3840 CSS px`);
  object(input.roles, Object.keys(SPACING_ROLES), `${label}.roles`);
  if (!Object.keys(input.roles).length) throw new Error(`${label}.roles must not be empty`);
  const roles = {};
  for (const role of Object.keys(SPACING_ROLES)) {
    if (!Object.hasOwn(input.roles, role)) continue;
    const value = input.roles[role];
    object(value, ["base", "wide"], `${label}.${role}`);
    roles[role] = { base: length(value.base, `${label}.${role}.base`), ...(value.wide === undefined ? {} : { wide: length(value.wide, `${label}.${role}.wide`) }) };
  }
  return { ...(input.wideMinWidth === undefined ? {} : { wideMinWidth: input.wideMinWidth }), roles };
}
export function effectiveSpacing(project, artifact) {
  if (artifact.selection.adapter !== "product-ui") {
    if (artifact.spacing !== undefined) throw new Error("Artifact spacing currently supports product-ui only");
    return null; // A mixed-surface project must not export CSS pixels to print or slides.
  }
  const common = project.spacing === undefined ? null : normalizeSpacing(project.spacing, "project.spacing");
  const local = artifact.spacing === undefined ? null : normalizeSpacing(artifact.spacing, "artifact.spacing");
  if (!common && !local) return null;
  const roles = { ...common?.roles, ...local?.roles }; // An overridden role replaces BOTH responsive values.
  return {
    wideMinWidth: local?.wideMinWidth ?? common?.wideMinWidth ?? 768,
    roles,
    sources: Object.fromEntries(Object.keys(roles).map((role) => [role, local?.roles[role] ? "artifact" : "project"])),
  };
}
export const spacingVariable = (role) => `--ss-space-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
export function spacingCss(spacing, artifactId) {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(artifactId)) throw new Error("Invalid spacing artifact ID");
  const selector = `[data-styleseed-artifact="${artifactId}"]`;
  const cssValue = (value) => typeof value === "number" ? `${value}px` : value;
  const entries = Object.keys(SPACING_ROLES).filter((role) => spacing.roles[role]);
  const base = entries.map((role) => `  ${spacingVariable(role)}: ${cssValue(spacing.roles[role].base)};`);
  const wide = entries.filter((role) => spacing.roles[role].wide !== undefined).map((role) => `    ${spacingVariable(role)}: ${cssValue(spacing.roles[role].wide)};`);
  return `${selector} {\n${base.join("\n")}\n}\n${wide.length ? `@media (min-width: ${spacing.wideMinWidth}px) {\n  ${selector} {\n${wide.join("\n")}\n  }\n}\n` : ""}`;
}
export function spacingSection(project, artifact) {
  const spacing = effectiveSpacing(project, artifact);
  if (!spacing) return null;
  return [
    "## Spatial roles for this artifact",
    "Explicit project/artifact spacing replaces illustrative spacing defaults, not task or accessibility requirements.",
    "Apply only declared roles. Unspecified roles preserve existing values. Density does not rescale these values.",
    `Wide starts at ${spacing.wideMinWidth} CSS px; omitted wide values use base. Font size, line-height, target size, and reading width remain separate.`,
    "| Role | Base | Wide | Source | Meaning |",
    "|---|---|---|---|---|",
    ...Object.keys(SPACING_ROLES).filter((role) => spacing.roles[role]).map((role) => `| ${role} | ${spacing.roles[role].base} | ${spacing.roles[role].wide ?? spacing.roles[role].base} | ${spacing.sources[role]} | ${SPACING_ROLES[role]} |`),
    "Map these variables to project components inside this artifact. Do not apply every role to every container or double the page inset through nesting.",
    "```css", spacingCss(spacing, artifact.id).trimEnd(), "```",
    "CSS variables are references to existing project tokens: confirm they resolve to usable nonnegative lengths at both viewports. Do not replace approved tokens just to match a suggested scale.",
    "Render and inspect grouping, repeated alignment, text wrapping, overflow, and loading/error states. Geometry compliance is not human design acceptance.",
  ].join("\n");
}

// Heuristic starting proposals for a new web system; never written automatically.
export function recommendSpacing(project, artifact) {
  if (artifact.selection.adapter !== "product-ui") throw new Error("Spacing proposals currently support product-ui only");
  const density = project.brand.density;
  if (!["compact", "comfortable", "spacious"].includes(density)) throw new Error("Unsupported density");
  const spacious = density === "spacious";
  const compact = density === "compact";
  const narrative = ["editorial-reading", "expressive-marketing"].includes(artifact.selection.grammar);
  const form = ["settings", "form"].includes(artifact.selection.page);
  const proposed = {
    pageInset: { base: 16, wide: 32 },
    sectionGap: { base: narrative ? 40 : spacious ? 40 : compact ? 24 : 32, wide: narrative ? 64 : spacious ? 48 : compact ? 32 : 40 },
    groupGap: { base: form ? 24 : compact ? 16 : 24 },
    stackGap: { base: 8 }, inlineGap: { base: 8 },
    componentInset: { base: compact ? 12 : spacious ? 24 : 16 },
  };
  const existing = effectiveSpacing(project, artifact);
  const roles = { ...proposed, ...existing?.roles };
  return {
    status: "proposal-not-applied", designAcceptance: "not-assessed",
    basis: { grammar: artifact.selection.grammar, page: artifact.selection.page, density },
    spacing: { wideMinWidth: existing?.wideMinWidth ?? 768, roles },
    preservedRoles: Object.keys(existing?.roles ?? {}),
    proposedRoles: Object.keys(proposed).filter((role) => !existing?.roles[role]),
    rationale: [
      form ? "Keep labels/help with their controls; use group spacing between distinct settings." : narrative ? "Use section gaps for changes in the argument; preserve tighter spacing within evidence groups." : "Keep comparable rows regular and related evidence close; use section gaps for independent tasks.",
      "These numeric values are starting hypotheses for new systems. Inspect existing token files before adoption; preserve approved spacing and adapt to content and viewport.",
      "Do not change typography or touch targets when adjusting whitespace. Wider spacing costs visible information; compact spacing may weaken grouping.",
    ],
  };
}
