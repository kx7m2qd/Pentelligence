import db from './db.js';
import { config } from './config.js';
import { isAnyScanTaskActive, getActiveTaskCount } from './scanState.js';

export function audit({ workspaceId = null, actorSessionId = null, requestId = null, action, target = '', authorizationNote = '', outcome }) {
  db.prepare('INSERT INTO audit_events (workspace_id, actor_session_id, request_id, action, target, authorization_note, outcome) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(workspaceId, actorSessionId, requestId, action, String(target).slice(0, 1000), String(authorizationNote).slice(0, 2000), outcome);
}
export function auditRequests(req, res, next) {
  if (['POST', 'PATCH', 'DELETE'].includes(req.method)) {
    audit({ workspaceId: req.workspaceId, actorSessionId: req.accessSessionId, requestId: req.requestId, action: `${req.method} ${req.path}`, target: req.body?.target || '', authorizationNote: req.body?.authorizationNote || '', outcome: 'requested' });
    res.on('finish', () => {
      try { audit({ workspaceId: req.workspaceId, actorSessionId: req.accessSessionId, requestId: req.requestId, action: `${req.method} ${req.path}`, target: req.body?.target || '', outcome: String(res.statusCode) }); }
      catch { req.log?.error('failed to record audit outcome'); }
    });
  }
  next();
}
export function scanCapacity(workspaceId) {
  if (getActiveTaskCount() >= config.maxConcurrentScans) return 'global scan capacity reached';
  const scans = db.prepare('SELECT id FROM scans WHERE workspace_id = ?').all(workspaceId);
  if (scans.filter(scan => isAnyScanTaskActive(scan.id)).length >= config.maxWorkspaceScans) return 'workspace scan capacity reached';
  const daily = db.prepare("SELECT COUNT(*) AS count FROM scan_events e JOIN scans s ON s.id=e.scan_id WHERE s.workspace_id=? AND e.phase='queued' AND e.created_at >= datetime('now', '-1 day')").get(workspaceId).count;
  const reruns = db.prepare("SELECT COUNT(*) AS count FROM audit_events WHERE workspace_id=? AND action='task.admitted' AND created_at >= datetime('now', '-1 day')").get(workspaceId).count;
  return daily + reruns >= config.maxDailyScans ? 'workspace daily scan quota reached' : null;
}
export function auditTaskAdmission(req, scan, task) {
  audit({ workspaceId: req.workspaceId, actorSessionId: req.accessSessionId, requestId: req.requestId, action: 'task.admitted', target: scan.target, authorizationNote: req.body?.authorizationNote || '', outcome: `${task}:${scan.id}` });
}
export function requireAdmin(req, res, next) {
  if (req.role !== 'admin') return res.status(403).json({ error: 'administrator role required' });
  next();
}
export function rolePolicy(req, res, next) {
  if (req.role === 'admin' || ['GET', 'HEAD'].includes(req.method)) return next();
  // Analysts may investigate and triage, but cannot change scope, delete data,
  // administer credentials/templates, or start active exploitation.
  if (req.method === 'DELETE' || /^\/(programs|templates|exploit|admin)(\/|$)/.test(req.path)) return requireAdmin(req, res, next);
  next();
}
