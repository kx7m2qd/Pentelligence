function normalizeRule(rule) {
  return String(rule || '').trim().toLowerCase().replace(/^\*\./, '*.');
}

export function parseRules(value) {
  if (Array.isArray(value)) return [...new Set(value.map(normalizeRule).filter(Boolean))];
  return [...new Set(String(value || '').split(/[\n,]/).map(normalizeRule).filter(Boolean))];
}

export function matchesRule(hostname, rule) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  const normalized = normalizeRule(rule);
  if (!host || !normalized) return false;
  if (normalized.startsWith('*.')) return host.endsWith(normalized.slice(1)) && host !== normalized.slice(2);
  return host === normalized;
}

export function isInScope(hostname, scopeRules, excludeRules = []) {
  return parseRules(excludeRules).some(rule => matchesRule(hostname, rule))
    ? false
    : parseRules(scopeRules).some(rule => matchesRule(hostname, rule));
}

export function assertInScope(target, program) {
  if (!program) return;
  if (!isInScope(target, program.scope, program.excludes)) {
    throw new Error(`target ${target} is outside the selected program scope`);
  }
}
