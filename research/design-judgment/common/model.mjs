// Pure synthetic domain behavior shared by all four conditions. No IO or production backend.
export function filterResources(resources, { query = '', status = 'all' } = {}) {
  if (!['all', 'active', 'paused'].includes(status)) throw new Error('Unknown status filter');
  const needle = query.trim().toLowerCase();
  return resources.filter(resource => (status === 'all' || resource.status === status)
    && [resource.id, resource.name, resource.owner].some(value => value.toLowerCase().includes(needle)));
}

export function pauseResources(resources, ids, role) {
  if (role !== 'editor') return { ok: false, reason: 'permission-denied', resources };
  const selected = [...new Set(ids)];
  if (!selected.length) return { ok: false, reason: 'empty-selection', resources };
  const targets = selected.map(id => resources.find(resource => resource.id === id));
  if (targets.some(resource => !resource)) return { ok: false, reason: 'unknown-resource', resources };
  if (targets.some(resource => resource.protected)) return { ok: false, reason: 'protected-resource', resources };
  if (targets.some(resource => resource.status !== 'active')) return { ok: false, reason: 'not-active', resources };
  return { ok: true, changedIds: selected, resources: resources.map(resource => selected.includes(resource.id)
    ? { ...resource, status: 'paused' } : resource) };
}

export function validateSettings(draft) {
  const errors = {};
  if (typeof draft.workspaceName !== 'string' || draft.workspaceName.trim().length < 2 || draft.workspaceName.trim().length > 40) {
    errors.workspaceName = 'Enter a workspace name with 2–40 characters.';
  }
  if (!['daily', 'weekly', 'off'].includes(draft.digest)) errors.digest = 'Choose daily, weekly, or off.';
  const raw = draft.retentionDays;
  const days = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+$/u.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (!Number.isInteger(days) || days < 7 || days > 90) errors.retentionDays = 'Enter a whole number from 7 to 90.';
  return Object.keys(errors).length ? { ok: false, errors } : {
    ok: true, errors: {}, value: { workspaceName: draft.workspaceName.trim(), digest: draft.digest, retentionDays: days },
  };
}

export function saveSettings(current, draft, { role, fail = false }) {
  if (role !== 'editor') return { ok: false, reason: 'permission-denied', saved: current, draft };
  const validation = validateSettings(draft);
  if (!validation.ok) return { ok: false, reason: 'invalid', errors: validation.errors, saved: current, draft };
  if (fail) return { ok: false, reason: 'save-failed', saved: current, draft };
  return { ok: true, saved: validation.value, draft: validation.value };
}

export function hasUnsavedChanges(saved, draft) {
  const validated = validateSettings(draft);
  return !validated.ok || ['workspaceName', 'digest', 'retentionDays'].some(key => saved[key] !== validated.value[key]);
}
