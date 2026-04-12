import express from 'express';
import db from '../db.js';
import { runNmap } from '../modules/nmap.js';
import { runSubfinder } from '../modules/subfinder.js';
import { runAgentLoop } from '../modules/agent.js';

const router = express.Router();

// POST /api/recon/start
// Body: { target: "domain.com" }
router.post('/start', async (req, res) => {
  const { target } = req.body;
  if (!target) return res.status(400).json({ error: 'target is required' });

  // create scan record
  const scan = db.prepare('INSERT INTO scans (target) VALUES (?)').run(target);
  const scanId = scan.lastInsertRowid;

  res.json({ scanId, message: 'recon started', target });

  // run async — results stream via /status
  try {
    await runSubfinder(target, scanId);
    await runNmap(target, scanId);

    // auto-trigger Groq agent after recon completes
    runAgentLoop(scanId, msg => {
      db.prepare("INSERT INTO agent_logs (scan_id, type, content) VALUES (?, ?, ?)")
        .run(scanId, "log", msg);
    });

    db.prepare('UPDATE scans SET status = ? WHERE id = ?')
      .run?.('done', scanId);
  } catch (err) {
    console.error('[recon] error:', err.message);
  }
});

// GET /api/recon/status/:scanId
router.get('/status/:scanId', (req, res) => {
  const { scanId } = req.params;

  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(scanId);
  if (!scan) return res.status(404).json({ error: 'scan not found' });

  const hosts = db.prepare('SELECT * FROM hosts WHERE scan_id = ?').all(scanId);
  const subdomains = db.prepare('SELECT subdomain FROM subdomains WHERE scan_id = ?').all(scanId);

  const hostsWithPorts = hosts.map(h => {
    const ports = db.prepare('SELECT * FROM ports WHERE host_id = ?').all(h.id);
    return { ...h, ports };
  });

  res.json({
    scan,
    hosts: hostsWithPorts,
    subdomains: subdomains.map(s => s.subdomain),
    stats: {
      hostsFound: hosts.length,
      subdomainsFound: subdomains.length,
      openPorts: hostsWithPorts.reduce((a, h) => a + h.ports.length, 0),
    }
  });
});

// GET /api/recon/scans — list all past scans
router.get('/scans', (req, res) => {
  const scans = db.prepare('SELECT * FROM scans ORDER BY created_at DESC').all();
  res.json({ scans });
});

// DELETE /api/recon/scan/:scanId — clear a scan
router.delete('/scan/:scanId', (req, res) => {
  const { scanId } = req.params;
  db.prepare('DELETE FROM ports WHERE host_id IN (SELECT id FROM hosts WHERE scan_id = ?)').run(scanId);
  db.prepare('DELETE FROM findings WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM agent_logs WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM hosts WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM subdomains WHERE scan_id = ?').run(scanId);
  db.prepare('DELETE FROM scans WHERE id = ?').run(scanId);
  res.json({ message: 'scan deleted' });
});

export default router;
