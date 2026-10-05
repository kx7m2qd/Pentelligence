import express from 'express';
import db from '../db.js';
import { ownedScan } from '../workspaces.js';
import { audit } from '../security.js';

const router = express.Router();
const VALID_STATUSES = new Set(['open', 'in_progress', 'accepted_risk', 'false_positive', 'resolved']);

router.patch('/confidence/:scanId/:source/:findingId', (req, res) => {
  const { scanId, source, findingId } = req.params;
  if (!ownedScan(req.workspaceId, scanId)) return res.status(404).json({ error: 'scan not found' });
  const table = { agent: 'findings', nuclei: 'nuclei_findings', exploit: 'exploit_results' }[source];
  const confidence = req.body?.confidence;
  if (!table || !['confirmed','suggested','unconfirmed'].includes(confidence)) return res.status(400).json({ error: 'invalid source or confidence' });
  const note = String(req.body?.authorizationNote || '').trim();
  if (note.length < 10) return res.status(400).json({ error: 'an evidence/review note of at least 10 characters is required' });
  const result = db.prepare(`UPDATE ${table} SET confidence=? WHERE scan_id=? AND id=?`).run(confidence, scanId, findingId);
  if (!result.changes) return res.status(404).json({ error: 'finding not found' });
  if (source !== 'agent') db.prepare(`UPDATE ${table} SET confirmed=? WHERE id=? AND scan_id=?`).run(confidence === 'confirmed' ? 1 : 0, findingId, scanId);
  audit({ workspaceId: req.workspaceId, actorSessionId: req.accessSessionId, requestId: req.requestId, action: `finding.confidence.${confidence}`, target: `${scanId}/${source}/${findingId}`, authorizationNote: note, outcome: 'saved' });
  res.json({ confidence });
});

router.get('/reviews/:scanId', (req, res) => {
  if (!ownedScan(req.workspaceId, req.params.scanId)) return res.status(404).json({ error: 'scan not found' });
  const reviews = db.prepare('SELECT * FROM finding_reviews WHERE workspace_id = ? AND scan_id = ?').all(req.workspaceId, req.params.scanId);
  res.json({ reviews });
});

router.patch('/reviews/:scanId/:source/:findingId', (req, res) => {
  const { scanId, source, findingId } = req.params;
  if (!ownedScan(req.workspaceId, scanId)) return res.status(404).json({ error: 'scan not found' });
  const table = { agent: 'findings', nuclei: 'nuclei_findings', exploit: 'exploit_results' }[source];
  if (!table || !db.prepare(`SELECT id FROM ${table} WHERE id=? AND scan_id=?`).get(Number(findingId), scanId)) return res.status(404).json({ error: 'finding not found' });
  const status = String(req.body?.status || 'open');
  if (!VALID_STATUSES.has(status)) return res.status(400).json({ error: 'invalid finding status' });

  db.prepare(`
    INSERT INTO finding_reviews (workspace_id, scan_id, source, finding_id, status, assignee, remediation_due_at, analyst_note, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(workspace_id, source, finding_id) DO UPDATE SET
      status = excluded.status,
      assignee = excluded.assignee,
      remediation_due_at = excluded.remediation_due_at,
      analyst_note = excluded.analyst_note,
      updated_at = CURRENT_TIMESTAMP
  `).run(req.workspaceId, scanId, source, Number(findingId), status, String(req.body?.assignee || ''), req.body?.remediationDueAt || null, String(req.body?.analystNote || ''));

  const review = db.prepare('SELECT * FROM finding_reviews WHERE workspace_id = ? AND source = ? AND finding_id = ?').get(req.workspaceId, source, Number(findingId));
  res.json({ review });
});

export default router;
