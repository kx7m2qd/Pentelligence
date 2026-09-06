import express from "express";
import db from "../db.js";
import { config } from "../config.js";
import { runAgentLoop } from "../modules/agent.js";
import { beginScanTask, endScanTask } from "../scanState.js";
import { ownedScan } from "../workspaces.js";

const router = express.Router();

// POST /api/agent/run/:scanId — kick off the agent loop
router.post("/run/:scanId", async (req, res) => {
  const { scanId } = req.params;
  const scan = ownedScan(req.workspaceId, scanId);
  if (!scan) return res.status(404).json({ error: "scan not found" });
  if (!config.groqApiKey) return res.status(400).json({ error: "GROQ_API_KEY is not configured" });
  if (!beginScanTask(scanId, "agent")) return res.status(409).json({ error: "agent loop already running" });

  res.status(202).json({ message: "agent loop started", scanId });

  void runAgentLoop(scanId, msg => {
    db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
      .run(scanId, "log", msg);
  }).finally(() => {
    endScanTask(scanId, "agent");
  });
});

// GET /api/agent/logs/:scanId — get all agent logs for a scan
router.get("/logs/:scanId", (req, res) => {
  if (!ownedScan(req.workspaceId, req.params.scanId)) return res.status(404).json({ error: "scan not found" });
  const logs = db.prepare(
    "SELECT * FROM agent_logs WHERE scan_id = ? ORDER BY created_at ASC"
  ).all(req.params.scanId);
  res.json({ logs });
});

// GET /api/agent/findings/:scanId — get all CVE findings
router.get("/findings/:scanId", (req, res) => {
  if (!ownedScan(req.workspaceId, req.params.scanId)) return res.status(404).json({ error: "scan not found" });
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
  if (!ownedScan(req.workspaceId, req.params.scanId)) return res.status(404).json({ error: "scan not found" });
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
