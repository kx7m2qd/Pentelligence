// Pure helpers that bind scan findings to the hosts shown on the attack
// surface map. No React, no API — easy to reason about and test by eye.

const SEVERITY_RANK = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function severityRank(severity) {
  return SEVERITY_RANK[String(severity || "").toUpperCase()] || 0;
}

export function maxSeverity(a, b) {
  return severityRank(a) >= severityRank(b) ? a : b;
}

// findings: [{ host, severity }] — host is hostname or ip as displayed.
// Returns an array aligned with hosts (by index): { maxSeverity, count } or null.
export function summarizeForHosts(findings, hosts) {
  if (!Array.isArray(findings) || !Array.isArray(hosts)) return hosts.map(() => null);

  const byHost = new Map();
  for (const finding of findings) {
    const key = String(finding.host || finding.hostname || finding.ip || "").toLowerCase();
    if (!key) continue;
    const entry = byHost.get(key) || { maxSeverity: null, count: 0 };
    entry.count += 1;
    entry.maxSeverity = maxSeverity(entry.maxSeverity, finding.severity);
    byHost.set(key, entry);
  }

  return hosts.map(host => {
    const key = String(host.hostname || host.ip || "").toLowerCase();
    return byHost.get(key) || null;
  });
}
