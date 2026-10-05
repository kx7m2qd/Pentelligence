import express from 'express';
import PDFDocument from 'pdfkit';
import db from './db.js';
import { ownedScan } from './workspaces.js';
import { findingFingerprint } from './fingerprints.js';

export function loadFindings(scanId) {
  const sources = [['findings','agent'], ['nuclei_findings','nuclei'], ['exploit_results','exploit']];
  const findings = sources.flatMap(([table, source]) => db.prepare(`SELECT f.*, h.hostname, h.ip FROM ${table} f JOIN hosts h ON h.id=f.host_id WHERE f.scan_id=?`).all(scanId).map(f => ({ ...f, source, title: f.title || f.name || f.type, score: f.score || f.cvss_score || 0 })));
  return [...new Map(findings.map(f => [findingFingerprint(f), f])).values()];
}
export function toSarif(findings) {
  return { version: '2.1.0', $schema: 'https://json.schemastore.org/sarif-2.1.0.json', runs: [{ tool: { driver: { name: 'Pentelligence' } }, results: findings.map(f => ({
    ruleId: `${f.source}/${f.template_id || f.cve_id || f.type || 'finding'}`,
    level: f.confidence !== 'confirmed' ? 'note' : ['CRITICAL','HIGH'].includes(String(f.severity).toUpperCase()) ? 'error' : 'warning',
    message: { text: `[${f.confidence}] ${f.title}: ${f.description || f.evidence || ''}` },
    partialFingerprints: { 'pentelligence/v1': findingFingerprint(f) },
    properties: { confidence: f.confidence, severity: f.severity, asset: f.hostname || f.ip, target: f.target || f.matched_at || '' },
  })) }] };
}
const router = express.Router();
router.get('/:scanId/:format', (req, res) => {
  const scan = ownedScan(req.workspaceId, req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });
  const format = req.params.format;
  if (!['md','pdf','sarif'].includes(format)) return res.status(400).json({ error: 'format must be md, pdf or sarif' });
  const findings = loadFindings(scan.id);
  res.attachment(`scan-${scan.id}.${format}`);
  if (format === 'sarif') return res.type('application/json').json(toSarif(findings));
  const lines = [`Pentelligence assessment: ${scan.target}`, `Scan #${scan.id} — ${scan.status}`, `Confirmed: ${findings.filter(f => f.confidence === 'confirmed').length}; total observations: ${findings.length}`, '', ...findings.flatMap(f => [`${f.title} — ${f.severity} — ${f.confidence}`, `Asset: ${f.hostname || f.ip}`, f.description || f.evidence || '', ''])];
  if (format === 'md') return res.type('text/markdown').send(lines.join('\n\n'));
  res.type('application/pdf');
  const document = new PDFDocument({ margin: 48 });
  document.on('error', () => res.destroy());
  document.pipe(res);
  for (const line of lines) document.fontSize(11).text(line).moveDown(0.5);
  document.end();
});
export default router;
