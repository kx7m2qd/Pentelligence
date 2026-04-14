import express from "express";
import db from "../db.js";
import { runNucleiOnScan } from "../modules/nuclei.js";

const router = express.Router();

// ── POST /api/nuclei/run/:scanId ─────────────────────────────────────────────
// Kicks off a nuclei scan for all hosts in the given scan.
// Responds immediately with 200 and fires the scan asynchronously.
router.post("/run/:scanId", async (req, res) => {
  const scanId = Number(req.params.scanId);
  const scan   = db.prepare("SELECT * FROM scans WHERE id = ?").get(scanId);
  if (!scan) return res.status(404).json({ error: "scan not found" });

  res.json({ message: "nuclei scan started", scanId });

  // fire async — logs streamed to agent_logs table
  runNucleiOnScan(scanId, msg => {
    db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
      .run(scanId, "nuclei-log", msg);
  });
});

// ── GET /api/nuclei/findings/:scanId ────────────────────────────────────────
// Returns all confirmed nuclei findings for a scan, with summary stats.
router.get("/findings/:scanId", (req, res) => {
  const scanId   = Number(req.params.scanId);
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

  if (!finding) return res.status(404).json({ error: "finding not found" });
  res.json({ finding });
});

export default router;
