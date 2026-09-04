export function findingFingerprint(finding) {
  return [
    finding.source || 'unknown',
    finding.template_id || finding.cve_id || finding.title || finding.name || 'finding',
    finding.hostname || finding.ip || finding.host || '',
    finding.port || '',
  ].map(value => String(value).trim().toLowerCase()).join('|');
}

export function compareFindings(previous, current) {
  const oldMap = new Map(previous.map(finding => [findingFingerprint(finding), finding]));
  const newMap = new Map(current.map(finding => [findingFingerprint(finding), finding]));
  const result = { new: [], fixed: [], unchanged: [], regressed: [] };
  for (const [fingerprint, finding] of newMap) {
    const oldFinding = oldMap.get(fingerprint);
    if (!oldFinding) result.new.push(finding);
    else if (Number(finding.score || finding.cvss_score || 0) > Number(oldFinding.score || oldFinding.cvss_score || 0)) result.regressed.push(finding);
    else result.unchanged.push(finding);
  }
  for (const [fingerprint, finding] of oldMap) if (!newMap.has(fingerprint)) result.fixed.push(finding);
  return result;
}
