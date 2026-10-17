import { logger } from "../logger.js";
import { execa } from 'execa';
import db from '../db.js';
import { assertScanTarget } from '../scanGuard.js';
import { beginScanTask, endScanTask } from '../scanState.js';
import { buildNucleiArgs } from '../nuclei-args.js';
import { templatesDir as TEMPLATES_DIR, templatesExist } from './templates.js';
import { parseNucleiOutput } from '../nuclei-output.js';

function insertFinding(finding) {
  db.prepare(`
    INSERT OR IGNORE INTO nuclei_findings
      (scan_id, host_id, template_id, name, severity, cvss_score,
       cve_id, description, matched_at, curl_cmd, confirmed, source, confidence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
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

export async function runNuclei(host, scanId, options = {}, execute = execa) {
  const target = host.hostname || host.ip;

  const args = buildNucleiArgs(target, options, {
    templatesDir: TEMPLATES_DIR,
    templatesAvailable: templatesExist(),
  });

  let hits;

  try {
    const result = await execute('nuclei', args, { reject: false });
    hits = parseNucleiOutput(result);
  } catch (err) {
    const notInstalled = err.code === 'ENOENT';
    if (notInstalled) {
      logger.warn(`[nuclei] nuclei is NOT INSTALLED — skipping scan for ${target}. Install with: brew install nuclei`);
      return { results: [], skipped: true, error: 'nuclei is not installed' };
    }
    logger.warn(`[nuclei] execution failed for ${target}: ${err.code || err.message}`);
    return { results: [], skipped: false, error: err.message };
  }

  const results = [];

  for (const hit of hits) {
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
  }

  logger.info(`[nuclei] ${results.length} confirmed findings on ${target}`);
  return { results, skipped: false, error: null };
}

export async function runNucleiOnScan(scanId, emitLog, options = {}, dependencies = {}) {
  const run = dependencies.run || runNuclei;
  const assertTarget = dependencies.assertTarget || assertScanTarget;
  const log = msg => {
    logger.info(`[nuclei] ${msg}`);
    if (emitLog) emitLog(`[nuclei] ${msg}`);
  };

  // Register nuclei as active task so the status endpoint reports running: true
  const registered = beginScanTask(scanId, 'nuclei');

  try {
    const hosts = db.prepare('SELECT * FROM hosts WHERE scan_id = ? ORDER BY hostname ASC, ip ASC').all(scanId);
    if (!hosts.length) {
      throw new Error('Nuclei checks incomplete: no hosts available to test');
    }

    log('Starting nuclei scan on all hosts...');

    let nucleiAvailable = true;
    let failedHosts = 0;

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
      await assertTarget(scanId, label);
      log(`Scanning ${label} — templates: ${recommendedCves.length > 0 ? recommendedCves.join(', ') : 'critical/high'}`);

      const outcome = await run(host, scanId, { ...options, cves: recommendedCves });

      // Handle the case where nuclei is not installed
      if (outcome.skipped) {
        log(`⚠ nuclei is NOT INSTALLED — cannot perform real vulnerability confirmation`);
        log(`Install nuclei: brew install nuclei && nuclei -update-templates`);
        nucleiAvailable = false;
        break;
      }

      if (outcome.error && !outcome.skipped) {
        failedHosts++;
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

    if (!nucleiAvailable || failedHosts) {
      throw new Error(!nucleiAvailable
        ? 'Nuclei checks incomplete: scanner unavailable'
        : `Nuclei checks incomplete: ${failedHosts} host check(s) failed`);
    }
    log('Nuclei scan complete.');
  } finally {
    // Only end the task if we registered it (avoids double-end if called from route)
    if (registered) {
      endScanTask(scanId, 'nuclei');
    }
  }
}
