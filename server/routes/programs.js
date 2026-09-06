import express from 'express';
import db from '../db.js';
import { parseRules } from '../scope.js';

const router = express.Router();

function serialize(row) {
  if (!row) return null;
  return {
    ...row,
    scope: JSON.parse(row.scope_json || '[]'),
    excludes: JSON.parse(row.excludes_json || '[]'),
    profile: JSON.parse(row.profile_json || '{}'),
  };
}

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM programs WHERE workspace_id = ? ORDER BY updated_at DESC').all(req.workspaceId);
  res.json({ programs: rows.map(serialize) });
});

router.post('/', (req, res) => {
  const name = String(req.body?.name || '').trim();
  const scope = parseRules(req.body?.scope);
  const excludes = parseRules(req.body?.excludes);
  if (!name || scope.length === 0) return res.status(400).json({ error: 'program name and at least one scope rule are required' });

  const result = db.prepare(`
    INSERT INTO programs (workspace_id, name, platform, notes, scope_json, excludes_json, profile_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.workspaceId, name, String(req.body?.platform || '').trim(), String(req.body?.notes || '').trim(), JSON.stringify(scope), JSON.stringify(excludes), JSON.stringify(req.body?.profile || {}));
  res.status(201).json({ program: serialize(db.prepare('SELECT * FROM programs WHERE id = ?').get(result.lastInsertRowid)) });
});

router.patch('/:id', (req, res) => {
  const program = db.prepare('SELECT * FROM programs WHERE id = ? AND workspace_id = ?').get(Number(req.params.id), req.workspaceId);
  if (!program) return res.status(404).json({ error: 'program not found' });
  const current = serialize(program);
  const scope = req.body?.scope === undefined ? current.scope : parseRules(req.body.scope);
  const excludes = req.body?.excludes === undefined ? current.excludes : parseRules(req.body.excludes);
  const name = req.body?.name === undefined ? current.name : String(req.body.name).trim();
  if (!name || scope.length === 0) return res.status(400).json({ error: 'program name and at least one scope rule are required' });
  db.prepare(`UPDATE programs SET name = ?, platform = ?, notes = ?, scope_json = ?, excludes_json = ?, profile_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?`)
    .run(name, req.body?.platform ?? current.platform, req.body?.notes ?? current.notes, JSON.stringify(scope), JSON.stringify(excludes), JSON.stringify(req.body?.profile ?? current.profile), program.id, req.workspaceId);
  res.json({ program: serialize(db.prepare('SELECT * FROM programs WHERE id = ?').get(program.id)) });
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM programs WHERE id = ? AND workspace_id = ?').run(Number(req.params.id), req.workspaceId);
  if (!result.changes) return res.status(404).json({ error: 'program not found' });
  res.status(204).end();
});

export default router;
