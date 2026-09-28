import { sourceInventory } from '../../ss-score/scripts/evidence-contract.mjs';
import { sha256, canonicalJson } from './runtime-contract.mjs';
import { effectiveSpacing } from './spacing-contract.mjs';

// Local source binding, not authentication of the renderer or human approval.
export function spacingSnapshot(projectRoot, project, artifact, engineRevision) {
  const roots = [...new Set([...artifact.implementation.sourceRoots, ...artifact.implementation.tokenFiles])].sort();
  const minimalRoots = roots.filter(path => !roots.some(parent => parent !== path && path.startsWith(`${parent}/`)));
  return {
    artifactId: artifact.id, engineRevision,
    configurationHash: sha256({ project, artifact }),
    implementationHash: sourceInventory(projectRoot, minimalRoots).hash,
  };
}

export function measurementAdvice(report, snapshot, project, artifact) {
  if (!report || report.schemaVersion !== 1 || report.artifactId !== artifact.id || canonicalJson(report.provenance) !== canonicalJson(snapshot)) throw new Error('Spacing measurement is missing, stale, or belongs to a different artifact; remeasure current sources');
  if (report.scope !== "supplied-bindings-at-one-viewport" || report.designAcceptance !== "not-assessed") throw new Error("Invalid spacing measurement scope");
  const effective = effectiveSpacing(project, artifact);
  if (!effective || canonicalJson(report.contract) !== canonicalJson({ wideMinWidth: effective.wideMinWidth, roles: effective.roles })) throw new Error('Spacing measurement contract mismatch');
  if (!Number.isInteger(report.viewport?.width) || report.viewport.width < 1 || !Number.isInteger(report.viewport?.height) || report.viewport.height < 1) throw new Error('Invalid measurement viewport');
  for (const key of ['measurements', 'failures', 'unsupported', 'observations']) if (!Array.isArray(report[key]) || report[key].length > 20000) throw new Error(`Invalid measurement ${key}`);
  const failureCodes = ['undeclared-role', 'binding-match-count', 'gap-container-not-supported', 'unresolved-token', 'invalid-token-length', 'unapplied-spacing', 'spacing-mismatch', 'missing-role-binding'];
  const unsupportedCodes = ['hidden-or-transformed-root', 'hidden-or-transformed-binding', 'unsupported-token-length', 'control-match-count', 'hidden-control'];
  if (report.failures.some(x => !x || !failureCodes.includes(x.code)) || report.unsupported.some(x => !x || !unsupportedCodes.includes(x.code)) || report.observations.some(x => !x || !['horizontal-overflow', 'control-wrap'].includes(x.code))) throw new Error('Unknown spacing finding');
  for (const item of report.observations) {
    if (item.code === 'control-wrap' && (!Number.isInteger(item.lines) || item.lines < 2)) throw new Error('Invalid control wrap observation');
    if (item.code === 'horizontal-overflow' && (typeof item.excessPx !== 'number' || !Number.isFinite(item.excessPx) || item.excessPx <= 1)) throw new Error('Invalid overflow observation');
  }
  const properties = { pageInset: ['paddingLeft', 'paddingRight'], sectionGap: ['rowGap'], groupGap: ['rowGap'], stackGap: ['rowGap'], inlineGap: ['columnGap'], componentInset: ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] };
  for (const item of report.measurements) {
    if (!item || !effective.roles[item.role] || ![item.expected, item.actual, item.delta].every(x => typeof x === 'number' && Number.isFinite(x) && x >= 0) || Math.abs(Math.abs(item.actual - item.expected) - item.delta) > 0.001) throw new Error('Invalid spacing measurement');
    if (!properties[item.role].includes(item.property)) throw new Error('Invalid measured property');
    const role = effective.roles[item.role];
    const expected = report.viewport.width >= effective.wideMinWidth ? role.wide ?? role.base : role.base;
    if (typeof expected === 'number' && Math.abs(expected - item.expected) > 0.001) throw new Error('Measurement value disagrees with viewport contract');
    if (item.delta > 0.5 && !report.failures.some(x => x.code === 'spacing-mismatch' && x.role === item.role)) throw new Error('Spacing mismatch cannot claim a pass');
  }
  for (const role of Object.keys(effective.roles)) if (!report.measurements.some(x => x.role === role) && !report.failures.some(x => x.role === role) && !report.unsupported.some(x => x.role === role || x.code === 'hidden-or-transformed-root')) throw new Error(`Measurement omits role ${role}`);
  const status = report.failures.length ? 'fail' : report.unsupported.length ? 'unsupported' : 'pass';
  if (report.status !== status) throw new Error('Spacing measurement status disagrees with findings');
  const actions = [];
  if (report.failures.some(x => ['unresolved-token', 'invalid-token-length'].includes(x.code))) actions.push({ priority: 1, action: 'repair-token-reference', reason: 'Resolve a nonnegative project token on the artifact root before changing spacing numbers. Do not silently substitute a preset.' });
  if (report.failures.some(x => !['unresolved-token', 'invalid-token-length'].includes(x.code))) actions.push({ priority: 1, action: 'repair-role-binding', reason: 'Correct missing, undeclared or unapplied role bindings. Preserve unrelated spacing and native fallback tokens.' });
  if (report.unsupported.length) actions.push({ priority: 1, action: 'complete-measurement', reason: 'Hidden/transformed elements or unsupported token units remain unverified; do not treat them as passing.' });
  if (report.observations.some(x => x.code === 'control-wrap')) actions.push({ priority: 2, action: 'review-control-width', reason: 'An explicitly no-wrap control spans multiple text lines. Inspect flex shrinking and reserved control width before reducing type or all page gaps.' });
  if (report.observations.some(x => x.code === 'horizontal-overflow')) actions.push({ priority: 2, action: 'review-container-width', reason: 'Inspect intrinsic child widths, wrapping and nested insets in the affected container before changing page-wide spacing.' });
  if (!actions.length) actions.push({ priority: 3, action: 'review-remaining-viewports-and-grouping', reason: 'Supplied bindings match at this viewport. Inspect other required states and visual grouping; matching numbers do not prove good rhythm.' });
  return { measurementStatus: status, measuredViewport: report.viewport, nextActions: actions, measurementTrust: 'local-source-bound; renderer-and-human-acceptance-not-authenticated' };
}
