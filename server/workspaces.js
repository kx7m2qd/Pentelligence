import crypto from 'node:crypto';
import db from './db.js';

export function createWorkspace(accessSessionId = null) {
  const token = crypto.randomBytes(32).toString('base64url');
  const result = db.prepare('INSERT INTO workspaces (token, access_session_id) VALUES (?, ?)').run(token, accessSessionId);
  return { id: Number(result.lastInsertRowid), token };
}

export function createAccessSession(ttlHours) {
  const token = crypto.randomBytes(32).toString('base64url');
  const result = db.prepare(`
    INSERT INTO access_sessions (token, expires_at)
    VALUES (?, datetime('now', ?))
  `).run(token, `+${ttlHours} hours`);
  return { id: Number(result.lastInsertRowid), token };
}

export function getAccessSession(token) {
  return db.prepare(`
    SELECT id, expires_at FROM access_sessions
    WHERE token = ? AND expires_at > CURRENT_TIMESTAMP
  `).get(token);
}

export function deleteAccessSession(token) {
  db.prepare('DELETE FROM access_sessions WHERE token = ?').run(token);
}

export function cleanupExpiredSessions() {
  db.prepare('DELETE FROM access_sessions WHERE expires_at <= CURRENT_TIMESTAMP').run();
}

export function requireAccessSession(req, res, next) {
  const token = String(req.headers['x-access-token'] || '').trim();
  const session = token ? getAccessSession(token) : null;
  if (!session) return res.status(401).json({ error: 'sign in is required' });
  req.accessSessionId = session.id;
  next();
}

export function requireWorkspace(req, res, next) {
  const token = String(req.headers['x-workspace-token'] || '').trim();
  const workspace = token
    ? req.accessSessionId
      ? db.prepare('SELECT id FROM workspaces WHERE token = ? AND access_session_id = ?').get(token, req.accessSessionId)
      : db.prepare('SELECT id FROM workspaces WHERE token = ?').get(token)
    : null;
  if (!workspace) return res.status(401).json({ error: 'workspace session is required' });
  req.workspaceId = workspace.id;
  next();
}

export function ownedScan(workspaceId, scanId) {
  return db.prepare('SELECT * FROM scans WHERE id = ? AND workspace_id = ?').get(scanId, workspaceId);
}
