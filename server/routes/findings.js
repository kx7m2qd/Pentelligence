import express from 'express';
import db from '../db.js';
import { ownedScan } from '../workspaces.js';

const router = express.Router();
const VALID_STATUSES = new Set(['open', 'in_progress', 'accepted_risk', 'false_positive', 'resolved']);

router.get('/reviews/:scanId', (req, res) => {
  if (!ownedScan(req.workspaceId, req.params.scanId)) return res.status(404).json({ error: 'scan not found' });
  const reviews = db.prepare('SELECT * FROM finding_reviews WHERE workspace_id = ? AND scan_id = ?').all(req.workspaceId, req.params.scanId);
  res.json({ reviews });
});

router.patch('/reviews/:scanId/:source/:findingId', (req, res) => {
  const { scanId, source, findingId } = req.params;
  if (!ownedScan(req.workspaceId, scanId)) return res.status(404).json({ error: 'scan not found' });
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
