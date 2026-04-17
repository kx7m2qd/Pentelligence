import express from "express";
import db from "../db.js";
import { runAgentLoop } from "../modules/agent.js";

const router = express.Router();

// POST /api/agent/run/:scanId — kick off the agent loop
router.post("/run/:scanId", async (req, res) => {
  const { scanId } = req.params;
  const scan = db.prepare("SELECT * FROM scans WHERE id = ?").get(scanId);
  if (!scan) return res.status(404).json({ error: "scan not found" });

  res.json({ message: "agent loop started", scanId });

  // run async
  runAgentLoop(scanId, msg => {
    db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
      .run(scanId, "log", msg);
  });
});

// GET /api/agent/logs/:scanId — get all agent logs for a scan
router.get("/logs/:scanId", (req, res) => {
  const logs = db.prepare(
    "SELECT * FROM agent_logs WHERE scan_id = ? ORDER BY created_at ASC"
  ).all(req.params.scanId);
  res.json({ logs });
});

// GET /api/agent/findings/:scanId — get all CVE findings
router.get("/findings/:scanId", (req, res) => {
  const findings = db.prepare(`
    SELECT f.*, h.hostname, h.ip
    FROM findings f
    JOIN hosts h ON f.host_id = h.id
    WHERE f.scan_id = ?
    ORDER BY f.score DESC
  `).all(req.params.scanId);
  res.json({ findings });
});

// GET /api/agent/decision/:scanId — get the final decision
router.get("/decision/:scanId", (req, res) => {
  const row = db.prepare(`
    SELECT * FROM agent_logs
    WHERE scan_id = ? AND type = 'decision'
    ORDER BY created_at DESC LIMIT 1
  `).get(req.params.scanId);

  if (!row) return res.json({ decision: null });
  try {
    res.json({ decision: JSON.parse(row.content) });
  } catch {
    res.json({ decision: row.content });
  }
});

export default router;
