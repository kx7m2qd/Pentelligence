import express from "express";
import db from "../db.js";
import { runNucleiOnScan } from "../modules/nuclei.js";
import { isScanTaskActive } from "../scanState.js";
import { ownedScan } from "../workspaces.js";

const router = express.Router();

function setScanState(scanId, updates) {
  const fields = [];
  const values = [];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  if (fields.length === 0) return;

  db.prepare(`UPDATE scans SET ${fields.join(", ")} WHERE id = ?`).run(...values, scanId);
}

// ── POST /api/nuclei/run/:scanId ─────────────────────────────────────────────
// Kicks off a nuclei scan for all hosts in the given scan.
// Responds immediately with 200 and fires the scan asynchronously.
router.post("/run/:scanId", async (req, res) => {
  const scanId = Number(req.params.scanId);
  const scan   = ownedScan(req.workspaceId, scanId);
  if (!scan) return res.status(404).json({ error: "scan not found" });
  if (isScanTaskActive(scanId, "nuclei")) return res.status(409).json({ error: "nuclei scan already running" });

  setScanState(scanId, {
    status: "running",
    phase: "nuclei",
    message: "Running nuclei confirmation checks",
    error_message: "",
  });

  res.status(202).json({ message: "nuclei scan started", scanId });

  // fire async — logs streamed to agent_logs table
  // runNucleiOnScan handles its own beginScanTask/endScanTask internally
  void runNucleiOnScan(scanId, msg => {
    db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
      .run(scanId, "nuclei-log", msg);
  }).finally(() => {
    const latestScan = db.prepare("SELECT status, phase FROM scans WHERE id = ?").get(scanId);
    if (latestScan?.phase === "nuclei") {
      setScanState(scanId, {
        status: latestScan.status === "error" ? "error" : "done",
        phase: latestScan.status === "error" ? "error" : "done",
        message: latestScan.status === "error" ? "Nuclei scan failed" : "Nuclei scan complete",
      });
    }
  });
});

router.get("/status/:scanId", (req, res) => {
  const scanId = Number(req.params.scanId);
  const scan = ownedScan(req.workspaceId, scanId);
  if (!scan) return res.status(404).json({ error: "scan not found" });

  const totalHosts = db.prepare("SELECT COUNT(*) AS count FROM hosts WHERE scan_id = ?").get(scanId)?.count || 0;
  const logs = db.prepare(`
    SELECT content, created_at
    FROM agent_logs
    WHERE scan_id = ? AND type = 'nuclei-log'
    ORDER BY id ASC
  `).all(scanId);

  const latestRunStartIndex = logs.findLastIndex(log => log.content.includes("[nuclei] Starting nuclei scan on all hosts"));
  const activeLogs = latestRunStartIndex >= 0 ? logs.slice(latestRunStartIndex) : logs;
  const completedHosts = activeLogs.filter(log => /confirmed finding|no vulnerabilities confirmed/.test(log.content)).length;
  const skipped = activeLogs.some(log => /NOT INSTALLED|scan skipped/.test(log.content));
  const lastScanningLine = [...activeLogs].reverse().find(log => log.content.includes("[nuclei] Scanning "));
  const currentTarget = lastScanningLine?.content.match(/\[nuclei\] Scanning (.+?) — templates:/)?.[1] || null;
  const nucleiRunning = isScanTaskActive(scanId, "nuclei");

  // Derive status message from nuclei logs when possible, falling back to scan.message
  let statusMessage = scan.message || null;
  if (activeLogs.length > 0) {
    const lastLog = activeLogs[activeLogs.length - 1]?.content || '';
    if (lastLog.includes('NOT INSTALLED')) {
      statusMessage = 'nuclei is not installed — install with: brew install nuclei';
    } else if (lastLog.includes('Nuclei scan complete')) {
      statusMessage = 'Nuclei scan complete';
    } else if (lastLog.includes('scan skipped')) {
      statusMessage = 'Nuclei scan skipped — tool not available';
    } else if (nucleiRunning) {
      statusMessage = `Scanning ${currentTarget || 'hosts'}…`;
    }
  }

  res.json({
    running: nucleiRunning,
    totalHosts,
    completedHosts: Math.min(completedHosts, totalHosts),
    currentTarget,
    recentLogs: activeLogs.slice(-8),
    statusMessage,
    skipped,
    phase: scan.phase || null,
    scanStatus: scan.status || null,
  });
});

// ── GET /api/nuclei/findings/:scanId ────────────────────────────────────────
// Returns all confirmed nuclei findings for a scan, with summary stats.
router.get("/findings/:scanId", (req, res) => {
  const scanId   = Number(req.params.scanId);
  if (!ownedScan(req.workspaceId, scanId)) return res.status(404).json({ error: "scan not found" });
  const findings = db.prepare(`
    SELECT n.*, h.hostname, h.ip
    FROM   nuclei_findings n
    JOIN   hosts h ON n.host_id = h.id
    WHERE  n.scan_id = ?
    ORDER  BY n.cvss_score DESC, n.created_at ASC
  `).all(scanId);

  const stats = {
    total:    findings.length,
    critical: findings.filter(f => f.severity === "CRITICAL").length,
    high:     findings.filter(f => f.severity === "HIGH").length,
    medium:   findings.filter(f => f.severity === "MEDIUM").length,
    low:      findings.filter(f => f.severity === "LOW").length,
  };

  res.json({ findings, stats });
});

// ── GET /api/nuclei/finding/:id ──────────────────────────────────────────────
// Returns a single finding with full host metadata.
router.get("/finding/:id", (req, res) => {
  const finding = db.prepare(`
    SELECT n.*, h.hostname, h.ip, h.os
    FROM   nuclei_findings n
    JOIN   hosts h ON n.host_id = h.id
    WHERE  n.id = ?
  `).get(Number(req.params.id));

  if (!finding || !ownedScan(req.workspaceId, finding.scan_id)) return res.status(404).json({ error: "finding not found" });
  res.json({ finding });
});

export default router;
