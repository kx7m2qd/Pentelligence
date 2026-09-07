import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import db from '../db.js';
import { config } from '../config.js';
import { runNmap } from '../modules/nmap.js';
import { runSubfinder } from '../modules/subfinder.js';
import { runAgentLoop } from '../modules/agent.js';
import { runNucleiOnScan } from '../modules/nuclei.js';
import { generateReport } from '../modules/groq.js';
import { beginScanTask, clearScanCancellation, endScanTask, getActiveTaskCount, isAnyScanTaskActive, isScanCancellationRequested, requestScanCancellation } from '../scanState.js';
import { assertPublicResolution, filterPublicTargets, normalizeTargetInput } from '../targets.js';
import { ownedScan } from '../workspaces.js';
import { assertInScope } from '../scope.js';
import { isInScope } from '../scope.js';
import { runWebProbe } from '../modules/webProbe.js';
import { captureScreenshots } from '../modules/screenshots.js';
import { notifyScanEvent } from '../notifications.js';
import { compareFindings } from '../fingerprints.js';

const router = express.Router();

// Mirrors src/data/constants.js SCAN_INTENSITY (frontend preset -> scan profile).
// Kept server-side so the backend does not import frontend code.
const INTENSITY_PROFILES = {
  safe: { rateLimit: 25, retries: 1 },
  balanced: { rateLimit: 50, retries: 1 },
  fast: { rateLimit: 100, retries: 0 },
};
const PORT_PROFILES = new Set(['quick', 'standard', 'full']);

function setScanState(scanId, updates) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;

  db.prepare(`UPDATE scans SET ${fields.join(', ')} WHERE id = ?`).run(...values, scanId);
}

function scanStreamSnapshot(workspaceId, scanId) {
  const scan = ownedScan(workspaceId, scanId);
  if (!scan) return null;
  const logs = db.prepare('SELECT type, content, created_at FROM agent_logs WHERE scan_id = ? ORDER BY id ASC').all(scanId);
  const hosts = db.prepare('SELECT id FROM hosts WHERE scan_id = ?').all(scanId);
  const openPorts = hosts.reduce((total, host) => total + (db.prepare('SELECT COUNT(*) AS count FROM ports WHERE host_id = ?').get(host.id)?.count || 0), 0);
  const findings = db.prepare('SELECT COUNT(*) AS count FROM findings WHERE scan_id = ?').get(scanId)?.count || 0;
  const nucleiFindings = db.prepare('SELECT COUNT(*) AS count FROM nuclei_findings WHERE scan_id = ?').get(scanId)?.count || 0;
  const decisionRow = db.prepare("SELECT content FROM agent_logs WHERE scan_id = ? AND type = 'decision' ORDER BY id DESC LIMIT 1").get(scanId);
  let decision = null;
  try { decision = decisionRow ? JSON.parse(decisionRow.content) : null; } catch { decision = null; }
  return { scan, stats: { hostsFound: hosts.length, openPorts }, logs, findingCount: findings + nucleiFindings, decision };
}

function buildReportSummary(scan, hosts, findings, exploitResults) {
  const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  const riskRating = findings.reduce((top, finding) => {
    const severity = String(finding.severity || '').toLowerCase();
    const weight = severityWeight[severity] || 0;
    return weight > (severityWeight[top] || 0) ? severity : top;
  }, findings.length > 0 ? 'low' : 'informational');

  const topFindings = findings.slice(0, 5);

  return {
    executive_summary: findings.length > 0
      ? `The assessment against ${scan.target} identified ${findings.length} verified findings across ${hosts.length} host${hosts.length === 1 ? '' : 's'}. The highest observed risk is ${riskRating}.`
      : `The assessment against ${scan.target} completed with no confirmed findings, but final confidence depends on installed tools and reachable services.`,
    risk_rating: riskRating,
    key_findings: topFindings.map(finding => `${finding.title} on ${finding.host}:${finding.port || 'n/a'}`),
    immediate_actions: findings.length > 0
      ? ['Patch the highest-severity exposed services.', 'Review external exposure and access controls.', 'Re-run confirmed checks after remediation.']
      : ['Verify required scanning tools are installed.', 'Confirm the target is reachable from this host.', 'Review scan logs for skipped or unavailable phases.'],
    remediation_steps: topFindings.map(finding => ({
      cve: finding.cve_id || finding.template_id || 'manual-review',
      fix: finding.description || `Validate and remediate ${finding.title}`,
      priority: String(finding.severity || 'medium').toLowerCase(),
      effort: finding.severity === 'CRITICAL' ? 'hours' : 'days',
    })),
    conclusion: exploitResults.length > 0
      ? `Manual exploitation recorded ${exploitResults.length} persisted result${exploitResults.length === 1 ? '' : 's'}. Prioritise containment before the next scan cycle.`
      : 'No exploit execution evidence was included in this report.',
  };
}

async function runReconPipeline(scanId, target, scopeRules = null, excludeRules = []) {
  if (!beginScanTask(scanId, 'pipeline')) {
    return;
  }

  try {
    const checkCancellation = () => {
      if (isScanCancellationRequested(scanId)) {
        const error = new Error('Scan cancelled by operator');
        error.code = 'SCAN_CANCELLED';
        throw error;
      }
    };
    setScanState(scanId, { status: 'running', phase: 'subfinder', message: 'Enumerating subdomains', error_message: '' });
    const discoveredSubdomains = await runSubfinder(target, scanId);
    checkCancellation();
    const scopedTargets = [...new Set([target, ...discoveredSubdomains])]
      .filter(candidate => !scopeRules || isInScope(candidate, scopeRules, excludeRules));
    const scanTargets = await filterPublicTargets(scopedTargets, { allowPrivateTargets: config.allowPrivateTargets });
    if (scopeRules && scanTargets.length < discoveredSubdomains.length + 1) {
      setScanState(scanId, { message: `Filtered ${discoveredSubdomains.length + 1 - scanTargets.length} discovered targets outside program scope` });
    }

    setScanState(scanId, {
      phase: 'nmap',
      message: `Scanning ports and services across ${scanTargets.length} discovered targets`,
    });
    const savedProfile = db.prepare('SELECT profile_json FROM scans WHERE id = ?').get(scanId);
    let profile = {};
    try { profile = JSON.parse(savedProfile?.profile_json || '{}'); } catch { profile = {}; }
    const hosts = await runNmap(scanTargets, scanId, profile.portProfile);
    checkCancellation();

    setScanState(scanId, { phase: 'web', message: `Probing HTTP services across ${scanTargets.length} targets` });
    const webAssets = await runWebProbe(scanId, scanTargets, msg => {
      db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)").run(scanId, "web-log", msg);
    });
    await captureScreenshots(scanId, webAssets, msg => {
      db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)").run(scanId, "web-log", msg);
    });
    checkCancellation();

    if (!hosts.length) {
      setScanState(scanId, { status: 'done', phase: 'done', message: 'No live hosts discovered', error_message: '' });
      return;
    }

    if (config.groqApiKey) {
      setScanState(scanId, { phase: 'agent', message: 'Analysing hosts with Groq' });
      await runAgentLoop(scanId, msg => {
        db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
          .run(scanId, "log", msg);
      });
      checkCancellation();
    }

    setScanState(scanId, { phase: 'nuclei', message: 'Running nuclei confirmation checks' });
    await runNucleiOnScan(scanId, msg => {
      db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
        .run(scanId, "nuclei-log", msg);
    }, profile);
    checkCancellation();

    setScanState(scanId, { status: 'done', phase: 'done', message: 'Recon pipeline complete', error_message: '' });
    void notifyScanEvent({ target, message: 'scan complete' });
  } catch (err) {
    console.error('[recon] pipeline error:', err.message);
    setScanState(scanId, err.code === 'SCAN_CANCELLED'
      ? { status: 'cancelled', phase: 'cancelled', message: 'Scan cancelled by operator', error_message: '' }
      : { status: 'error', phase: 'error', message: 'Recon pipeline failed', error_message: err.message });
    void notifyScanEvent({ target, message: `scan failed: ${err.message}` });
  } finally {
    clearScanCancellation(scanId);
    endScanTask(scanId, 'pipeline');
  }
}

// POST /api/recon/start
// Body: { target: "domain.com" }
router.post('/start', async (req, res) => {
  let normalizedTarget;

  try {
    normalizedTarget = normalizeTargetInput(req.body?.target, {
      allowPrivateTargets: config.allowPrivateTargets,
    }).normalizedTarget;
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  try {
    await assertPublicResolution(normalizedTarget, { allowPrivateTargets: config.allowPrivateTargets });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (req.body?.authorizationConfirmed !== true) {
    return res.status(400).json({ error: 'explicit authorization confirmation is required before scanning' });
  }
  const program = req.body?.programId
    ? db.prepare('SELECT * FROM programs WHERE id = ? AND workspace_id = ?').get(Number(req.body.programId), req.workspaceId)
    : null;
  if (req.body?.programId && !program) return res.status(404).json({ error: 'program not found' });
  try {
    assertInScope(normalizedTarget, program && { scope: JSON.parse(program.scope_json), excludes: JSON.parse(program.excludes_json) });
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }
  if (getActiveTaskCount() >= config.maxConcurrentScans) {
    return res.status(429).json({ error: `scan capacity reached; at most ${config.maxConcurrentScans} scan tasks may run at once` });
  }

  db.prepare(`
    INSERT INTO scope_authorizations (workspace_id, target, authorization_note)
    VALUES (?, ?, ?)
  `).run(req.workspaceId, normalizedTarget, String(req.body?.authorizationNote || '').trim());

  const existing = db.prepare(`
    SELECT id, target
    FROM scans
    WHERE target = ? AND status = 'running' AND workspace_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(normalizedTarget, req.workspaceId);

  if (existing) {
    if (isAnyScanTaskActive(existing.id)) {
      return res.status(202).json({ scanId: existing.id, target: existing.target, existing: true });
    }

    setScanState(existing.id, {
      status: 'error',
      phase: 'error',
      message: 'Previous scan interrupted',
      error_message: 'Previous scan was left in running state after a restart or crash',
    });
  }

  // Resolve the scan profile: an explicit UI intensity wins, otherwise fall
  // back to the linked program's profile, otherwise default to balanced.
  const requestedIntensity = req.body?.intensity;
  let profile;
  if (INTENSITY_PROFILES[requestedIntensity]) {
    profile = { ...INTENSITY_PROFILES[requestedIntensity] };
  } else if (program) {
    try {
      profile = JSON.parse(program.profile_json || '{}');
    } catch {
      profile = {};
    }
  } else {
    profile = { ...INTENSITY_PROFILES.balanced };
  }
  profile.portProfile = PORT_PROFILES.has(req.body?.portProfile) ? req.body.portProfile : 'standard';

  const scan = db.prepare(`
    INSERT INTO scans (target, status, phase, message, error_message, workspace_id, program_id, profile_json)
    VALUES (?, 'running', 'queued', 'Scan queued', '', ?, ?, ?)
  `).run(normalizedTarget, req.workspaceId, program?.id || null, JSON.stringify(profile));
  const scanId = Number(scan.lastInsertRowid);

  res.status(202).json({ scanId, message: 'recon started', target: normalizedTarget });

  const scopeRules = program ? JSON.parse(program.scope_json || '[]') : null;
  const excludeRules = program ? JSON.parse(program.excludes_json || '[]') : [];
  void runReconPipeline(scanId, normalizedTarget, scopeRules, excludeRules);
});

router.post('/cancel/:scanId', (req, res) => {
  const scan = ownedScan(req.workspaceId, req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });
  if (scan.status !== 'running') return res.status(409).json({ error: `scan is ${scan.status}` });
  requestScanCancellation(scan.id);
  setScanState(scan.id, { message: 'Cancellation requested — finishing the current tool step' });
  res.status(202).json({ scanId: scan.id, status: 'cancelling' });
});

router.get('/events/:scanId', (req, res) => {
  const scanId = Number(req.params.scanId);
  if (!scanStreamSnapshot(req.workspaceId, scanId)) return res.status(404).json({ error: 'scan not found' });
  res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.flushHeaders();
  let last = '';
  let closed = false;
  const intervalId = setInterval(() => {
    if (closed) return;
    const snapshot = scanStreamSnapshot(req.workspaceId, scanId);
    if (!snapshot) return;
    const payload = JSON.stringify(snapshot);
    if (payload !== last) {
      last = payload;
      res.write(`event: scan\ndata: ${payload}\n\n`);
    }
    if (['done', 'error', 'cancelled'].includes(snapshot.scan.status)) {
      clearInterval(intervalId);
      setTimeout(() => res.end(), 250);
    }
  }, 750);
  const heartbeatId = setInterval(() => { if (!closed) res.write(': heartbeat\n\n'); }, 15000);
  req.on('close', () => { closed = true; clearInterval(intervalId); clearInterval(heartbeatId); });
  res.write(`event: scan\ndata: ${JSON.stringify(scanStreamSnapshot(req.workspaceId, scanId))}\n\n`);
});

// GET /api/recon/status/:scanId
router.get('/status/:scanId', (req, res) => {
  const { scanId } = req.params;

  const scan = ownedScan(req.workspaceId, scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });

  const hosts = db.prepare('SELECT * FROM hosts WHERE scan_id = ? ORDER BY hostname ASC, ip ASC').all(scanId);
  const subdomains = db.prepare('SELECT subdomain FROM subdomains WHERE scan_id = ? ORDER BY subdomain ASC').all(scanId);

  const hostsWithPorts = hosts.map(host => {
    const ports = db.prepare('SELECT * FROM ports WHERE host_id = ? ORDER BY port ASC').all(host.id);
    return { ...host, ports };
  });

  res.json({
    scan,
    hosts: hostsWithPorts,
    subdomains: subdomains.map(subdomain => subdomain.subdomain),
    webAssets: db.prepare('SELECT * FROM web_assets WHERE scan_id = ? ORDER BY hostname ASC').all(scanId),
    evidence: db.prepare('SELECT id, type, target, path, metadata_json, created_at FROM evidence WHERE scan_id = ? ORDER BY created_at DESC').all(scanId),
    stats: {
      hostsFound: hosts.length,
      subdomainsFound: subdomains.length,
      openPorts: hostsWithPorts.reduce((total, host) => total + host.ports.length, 0),
    },
  });
});

// GET /api/recon/scans — list all past scans
router.get('/scans', (req, res) => {
  const scans = db.prepare('SELECT * FROM scans WHERE workspace_id = ? ORDER BY created_at DESC').all(req.workspaceId);
  res.json({ scans });
});

router.get('/compare/:scanId', (req, res) => {
  const scan = ownedScan(req.workspaceId, req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });
  const previous = db.prepare(`SELECT * FROM scans WHERE workspace_id = ? AND target = ? AND status = 'done' AND id < ? ORDER BY id DESC LIMIT 1`).get(req.workspaceId, scan.target, scan.id);
  if (!previous) return res.json({ previous: null, comparison: { new: [], fixed: [], unchanged: [], regressed: [] } });
  const loadFindings = scanId => [
    ...db.prepare('SELECT f.*, h.hostname, h.ip FROM findings f JOIN hosts h ON h.id = f.host_id WHERE f.scan_id = ?').all(scanId).map(finding => ({ ...finding, source: 'agent' })),
    ...db.prepare('SELECT n.*, h.hostname, h.ip FROM nuclei_findings n JOIN hosts h ON h.id = n.host_id WHERE n.scan_id = ?').all(scanId).map(finding => ({ ...finding, title: finding.name, score: finding.cvss_score, source: 'nuclei' })),
  ];
  res.json({ previous, comparison: compareFindings(loadFindings(previous.id), loadFindings(scan.id)) });
});

router.get('/report/:scanId', async (req, res) => {
  const { scanId } = req.params;
  const scan = ownedScan(req.workspaceId, scanId);

  if (!scan) {
    return res.status(404).json({ error: 'scan not found' });
  }

  const hosts = db.prepare('SELECT * FROM hosts WHERE scan_id = ? ORDER BY hostname ASC, ip ASC').all(scanId);
  const findings = [
    ...db.prepare(`
      SELECT f.*, h.hostname, h.ip
      FROM findings f
      JOIN hosts h ON f.host_id = h.id
      WHERE f.scan_id = ?
      ORDER BY f.score DESC, f.created_at ASC
    `).all(scanId).map(finding => ({
      ...finding,
      host: finding.hostname || finding.ip,
    })),
    ...db.prepare(`
      SELECT n.*, h.hostname, h.ip
      FROM nuclei_findings n
      JOIN hosts h ON n.host_id = h.id
      WHERE n.scan_id = ?
      ORDER BY n.cvss_score DESC, n.created_at ASC
    `).all(scanId).map(finding => ({
      ...finding,
      title: finding.name,
      score: finding.cvss_score,
      host: finding.hostname || finding.ip,
      port: null,
    })),
  ];
  const exploitResults = db.prepare(`
    SELECT e.*, h.hostname, h.ip
    FROM exploit_results e
    JOIN hosts h ON e.host_id = h.id
    WHERE e.scan_id = ?
    ORDER BY e.created_at ASC
  `).all(scanId);

  let report = null;

  if (config.groqApiKey && findings.length > 0) {
    try {
      report = await generateReport({
        target: scan.target,
        hosts,
        findings,
      });
    } catch (err) {
      console.error('[report] groq generation failed:', err.message);
    }
  }

  if (!report) {
    report = buildReportSummary(scan, hosts, findings, exploitResults);
  }

  res.json({
    report,
    meta: {
      scan,
      hostCount: hosts.length,
      findingCount: findings.length,
      exploitCount: exploitResults.length,
    },
  });
});

// DELETE /api/recon/scan/:scanId — clear a scan
router.delete('/scan/:scanId', (req, res) => {
  const { scanId } = req.params;

  if (!ownedScan(req.workspaceId, scanId)) return res.status(404).json({ error: 'scan not found' });

  if (isAnyScanTaskActive(scanId)) {
    return res.status(409).json({ error: 'scan is currently running' });
  }

  db.prepare('DELETE FROM ports WHERE host_id IN (SELECT id FROM hosts WHERE scan_id = ?)').run(scanId);
  db.prepare('DELETE FROM findings WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM nuclei_findings WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM exploit_results WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM agent_logs WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM hosts WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM subdomains WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM web_assets WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM evidence WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM scans WHERE id = ?').run(scanId);
  res.json({ message: 'scan deleted' });
});

// GET /api/recon/evidence/:scanId/:filename — serve screenshot image
router.get('/evidence/:scanId/:filename', (req, res) => {
  const scan = ownedScan(req.workspaceId, req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });
  const filename = path.basename(req.params.filename);
  if (!/^[a-zA-Z0-9_.-]+\.(png|jpe?g|webp)$/i.test(filename)) {
    return res.status(400).json({ error: 'invalid filename' });
  }
  const filePath = path.join(process.cwd(), 'data', 'evidence', String(scan.id), filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'evidence file not found' });
  }
  res.sendFile(filePath);
});

// POST /api/recon/retry/:scanId — resume or retry a failed / cancelled scan
router.post('/retry/:scanId', async (req, res) => {
  const scan = ownedScan(req.workspaceId, req.params.scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });
  if (isAnyScanTaskActive(scan.id)) {
    return res.status(409).json({ error: 'scan is currently active' });
  }
  if (getActiveTaskCount() >= config.maxConcurrentScans) {
    return res.status(429).json({ error: `scan capacity reached; at most ${config.maxConcurrentScans} scan tasks may run at once` });
  }

  const program = scan.program_id
    ? db.prepare('SELECT * FROM programs WHERE id = ? AND workspace_id = ?').get(scan.program_id, req.workspaceId)
    : null;
  const scopeRules = program ? JSON.parse(program.scope_json || '[]') : null;
  const excludeRules = program ? JSON.parse(program.excludes_json || '[]') : [];

  setScanState(scan.id, {
    status: 'running',
    phase: 'queued',
    message: 'Scan retrying — resuming pipeline',
    error_message: '',
  });

  res.status(202).json({ scanId: scan.id, message: 'recon retried', target: scan.target });
  void runReconPipeline(scan.id, scan.target, scopeRules, excludeRules);
});

// GET /api/recon/backup — export all workspace scan and program data
router.get('/backup', (req, res) => {
  const scans = db.prepare('SELECT * FROM scans WHERE workspace_id = ? ORDER BY id DESC').all(req.workspaceId);
  const scanIds = scans.map(s => s.id);
  const programs = db.prepare('SELECT * FROM programs WHERE workspace_id = ?').all(req.workspaceId);
  let hosts = [];
  let ports = [];
  let subdomains = [];
  let webAssets = [];
  let findings = [];
  let nucleiFindings = [];
  let exploitResults = [];
  let agentLogs = [];
  let reviews = [];

  if (scanIds.length > 0) {
    const placeholders = scanIds.map(() => '?').join(',');
    hosts = db.prepare(`SELECT * FROM hosts WHERE scan_id IN (${placeholders})`).all(...scanIds);
    subdomains = db.prepare(`SELECT * FROM subdomains WHERE scan_id IN (${placeholders})`).all(...scanIds);
    webAssets = db.prepare(`SELECT * FROM web_assets WHERE scan_id IN (${placeholders})`).all(...scanIds);
    findings = db.prepare(`SELECT * FROM findings WHERE scan_id IN (${placeholders})`).all(...scanIds);
    nucleiFindings = db.prepare(`SELECT * FROM nuclei_findings WHERE scan_id IN (${placeholders})`).all(...scanIds);
    exploitResults = db.prepare(`SELECT * FROM exploit_results WHERE scan_id IN (${placeholders})`).all(...scanIds);
    agentLogs = db.prepare(`SELECT * FROM agent_logs WHERE scan_id IN (${placeholders})`).all(...scanIds);
    reviews = db.prepare(`SELECT * FROM finding_reviews WHERE workspace_id = ?`).all(req.workspaceId);

    const hostIds = hosts.map(h => h.id);
    if (hostIds.length > 0) {
      const hostPlaceholders = hostIds.map(() => '?').join(',');
      ports = db.prepare(`SELECT * FROM ports WHERE host_id IN (${hostPlaceholders})`).all(...hostIds);
    }
  }

  const backupData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    workspace_id: req.workspaceId,
    programs,
    scans,
    hosts,
    ports,
    subdomains,
    webAssets,
    findings,
    nucleiFindings,
    exploitResults,
    agentLogs,
    reviews,
  };

  const filename = `pentelligence-backup-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(backupData);
});

export default router;
