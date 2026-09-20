import db from './db.js';
import { compareFindings } from './fingerprints.js';
import { notifyScanEvent } from './notifications.js';
import { runScheduledProgramScan } from './routes/recon.js';

const activeSchedules = new Set();
let timer = null;

export function normalizeScheduleInterval(value) {
  const hours = Number(value);
  return [24, 168].includes(hours) ? hours : null;
}

function loadFindings(scanId) {
  return [
    ...db.prepare('SELECT f.*, h.hostname, h.ip FROM findings f JOIN hosts h ON h.id = f.host_id WHERE f.scan_id = ?').all(scanId).map(item => ({ ...item, source: 'agent' })),
    ...db.prepare('SELECT n.*, h.hostname, h.ip FROM nuclei_findings n JOIN hosts h ON h.id = n.host_id WHERE n.scan_id = ?').all(scanId).map(item => ({ ...item, title: item.name, score: item.cvss_score, source: 'nuclei' })),
  ];
}

async function executeSchedule(schedule) {
  if (activeSchedules.has(schedule.id)) return;
  activeSchedules.add(schedule.id);
  try {
    const claimed = db.prepare(`
      UPDATE program_schedules
      SET last_run_at = CURRENT_TIMESTAMP,
          next_run_at = datetime('now', '+' || interval_hours || ' hours'),
          last_status = 'running',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND enabled = 1 AND next_run_at <= CURRENT_TIMESTAMP
    `).run(schedule.id);
    if (!claimed.changes) return;
    const scan = await runScheduledProgramScan(schedule);
    if (scan.status !== 'done') throw new Error(scan.error_message || `scan ended with ${scan.status}`);
    const previous = db.prepare(`SELECT id FROM scans WHERE workspace_id = ? AND target = ? AND status = 'done' AND id < ? ORDER BY id DESC LIMIT 1`).get(schedule.workspace_id, scan.target, scan.id);
    const comparison = previous ? compareFindings(loadFindings(previous.id), loadFindings(scan.id)) : { new: [], regressed: [] };
    const changeCount = comparison.new.length + comparison.regressed.length;
    const status = !previous ? 'baseline' : changeCount > 0 ? 'changes' : 'no_changes';
    db.prepare(`UPDATE program_schedules SET last_scan_id = ?, last_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(scan.id, status, schedule.id);
    if (changeCount > 0) {
      await notifyScanEvent({ target: scan.target, message: `${comparison.new.length} new and ${comparison.regressed.length} regressed finding(s) in scheduled monitoring` });
    }
  } catch (error) {
    db.prepare(`UPDATE program_schedules SET last_status = 'error', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(schedule.id);
    await notifyScanEvent({ target: schedule.target, message: `scheduled monitoring failed: ${error.message}` });
    console.warn(`[scheduler] ${schedule.target}: ${error.message}`);
  } finally {
    activeSchedules.delete(schedule.id);
  }
}

export function checkDueSchedules() {
  const due = db.prepare(`SELECT * FROM program_schedules WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= CURRENT_TIMESTAMP ORDER BY next_run_at ASC`).all();
  for (const schedule of due) void executeSchedule(schedule);
  return due.length;
}

export function startScheduler() {
  if (timer) return;
  checkDueSchedules();
  timer = setInterval(checkDueSchedules, 60_000);
  timer.unref?.();
}
