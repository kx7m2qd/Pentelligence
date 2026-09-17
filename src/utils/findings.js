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

// Markdown draft for one finding, ready to paste into a bounty submission.
export function buildFindingMarkdown(finding) {
  if (!finding) return '';
  const lines = [];
  lines.push(`## ${finding.title || finding.name || finding.cve_id || 'Finding'}`);
  lines.push('');
  lines.push(`- Severity: ${String(finding.severity || 'unknown').toUpperCase()}`);
  lines.push(`- Asset: ${finding.host || 'unknown'}`);
  if (finding.matched_at) lines.push(`- Matched at: ${finding.matched_at}`);
  if (finding.cve_id || finding.template_id) lines.push(`- Reference: ${finding.cve_id || finding.template_id}`);
  if (finding.curl_cmd) {
    lines.push('');
    lines.push('### Reproduction');
    lines.push('');
    lines.push('```bash');
    lines.push(finding.curl_cmd);
    lines.push('```');
  }
  if (finding.description) {
    lines.push('');
    lines.push('### Details');
    lines.push('');
    lines.push(finding.description);
  }
  return lines.join('\n');
}
