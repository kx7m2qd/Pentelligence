import fs from 'fs';
import path from 'path';
import { execa } from 'execa';
import db from '../db.js';
import { beginScanTask, endScanTask } from '../scanState.js';
import { buildNucleiArgs } from '../nuclei-args.js';

const TEMPLATES_DIR = process.env.NUCLEI_TEMPLATES_DIR || path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  'nuclei-templates',
);

// Check at startup
const TEMPLATES_AVAILABLE = fs.existsSync(TEMPLATES_DIR);
if (!TEMPLATES_AVAILABLE) {
  console.warn(`[nuclei] templates directory not found at ${TEMPLATES_DIR} — CVE-specific scans will use default templates`);
}

function insertFinding(finding) {
  db.prepare(`
    INSERT OR IGNORE INTO nuclei_findings
      (scan_id, host_id, template_id, name, severity, cvss_score,
       cve_id, description, matched_at, curl_cmd, confirmed, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    finding.scan_id,
    finding.host_id,
    finding.template_id,
    finding.name,
    finding.severity,
    finding.cvss_score,
    finding.cve_id,
    finding.description,
    finding.matched_at,
    finding.curl_cmd,
    finding.confirmed,
    finding.source,
  );
}

export async function runNuclei(host, scanId, options = {}) {
  const target = host.hostname || host.ip;

  const args = buildNucleiArgs(target, options, {
    templatesDir: TEMPLATES_DIR,
    templatesAvailable: TEMPLATES_AVAILABLE,
  });

  let stdout = '';

  try {
    const result = await execa('nuclei', args, { reject: false });
    stdout = result.stdout || '';
  } catch (err) {
    const notInstalled = err.code === 'ENOENT' || err.message?.includes('not found');
    if (notInstalled) {
      console.warn(`[nuclei] nuclei is NOT INSTALLED — skipping scan for ${target}. Install with: brew install nuclei`);
      return { results: [], skipped: true, error: 'nuclei is not installed' };
    }
    console.warn(`[nuclei] execution failed for ${target}: ${err.code || err.message}`);
    return { results: [], skipped: false, error: err.message };
  }

  const results = [];

  for (const line of stdout.split('\n').filter(Boolean)) {
    try {
      const hit = JSON.parse(line);
      const finding = {
        scan_id: scanId,
        host_id: host.id,
        template_id: hit['template-id'] || '',
        name: hit.info?.name || '',
        severity: String(hit.info?.severity || 'unknown').toUpperCase(),
        cvss_score: hit.info?.classification?.['cvss-score'] ?? 0,
        cve_id: hit.info?.classification?.['cve-id']?.[0] || '',
        description: hit.info?.description || '',
        matched_at: hit['matched-at'] || '',
        curl_cmd: hit['curl-command'] || '',
        confirmed: 1,
        source: 'nuclei',
      };

      insertFinding(finding);
      results.push(finding);
    } catch {
      // Ignore malformed JSON lines from nuclei output.
    }
  }

  console.log(`[nuclei] ${results.length} confirmed findings on ${target}`);
  return { results, skipped: false, error: null };
}

export async function runNucleiOnScan(scanId, emitLog, options = {}) {
  const log = msg => {
    console.log(`[nuclei] ${msg}`);
    if (emitLog) emitLog(`[nuclei] ${msg}`);
  };

  // Register nuclei as active task so the status endpoint reports running: true
  const registered = beginScanTask(scanId, 'nuclei');

  try {
    const hosts = db.prepare('SELECT * FROM hosts WHERE scan_id = ? ORDER BY hostname ASC, ip ASC').all(scanId);
    if (!hosts.length) {
      log('No hosts to scan.');
      return;
    }

    log('Starting nuclei scan on all hosts...');

    let nucleiAvailable = true;

    for (const host of hosts) {
      const agentLog = db.prepare(`
        SELECT content
        FROM agent_logs
        WHERE scan_id = ? AND host_id = ? AND type = 'analysis'
        ORDER BY created_at DESC
        LIMIT 1
      `).get(scanId, host.id);

      let recommendedCves = [];
      if (agentLog) {
        try {
          const analysis = JSON.parse(agentLog.content);
          recommendedCves = (analysis.cves || []).map(cve => cve.id).filter(Boolean);
        } catch {
          // Ignore malformed analysis records.
        }
      }

      const label = host.hostname || host.ip;
      log(`Scanning ${label} — templates: ${recommendedCves.length > 0 ? recommendedCves.join(', ') : 'critical/high'}`);

      const outcome = await runNuclei(host, scanId, { ...options, cves: recommendedCves });

      // Handle the case where nuclei is not installed
      if (outcome.skipped) {
        log(`⚠ nuclei is NOT INSTALLED — cannot perform real vulnerability confirmation`);
        log(`Install nuclei: brew install nuclei && nuclei -update-templates`);
        nucleiAvailable = false;
        break;
      }

      if (outcome.error && !outcome.skipped) {
        log(`${label} — scan error: ${outcome.error}`);
        continue;
      }

      const results = outcome.results;

      if (results.length === 0) {
        log(`${label} — no vulnerabilities confirmed`);
      } else {
        log(`${label} — ${results.length} confirmed finding${results.length === 1 ? '' : 's'}`);
        for (const finding of results) {
          log(`  [${finding.severity}] ${finding.cve_id || finding.template_id} → ${finding.matched_at}`);
        }
      }
    }

    if (nucleiAvailable) {
      log('Nuclei scan complete.');
    } else {
      log('Nuclei scan skipped — tool not available. Results are from AI analysis only.');
    }
  } finally {
    // Only end the task if we registered it (avoids double-end if called from route)
    if (registered) {
      endScanTask(scanId, 'nuclei');
    }
  }
}
