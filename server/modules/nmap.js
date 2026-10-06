import { logger } from "../logger.js";
import { execa } from 'execa';
import { parseNmapXml } from '../parsers.js';
import db from '../db.js';
import { assertScanTarget } from '../scanGuard.js';
import { isIP } from 'node:net';

import { toolExecution } from '../toolExecution.js';

function upsertHost(scanId, ip, hostname, osName) {
  const existing = db.prepare(`
    SELECT id
    FROM hosts
    WHERE scan_id = ? AND ip = ? AND hostname = ?
  `).get(scanId, ip, hostname);

  if (existing?.id) {
    db.prepare('UPDATE hosts SET os = ?, status = ? WHERE id = ?').run(osName, 'up', existing.id);
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO hosts (scan_id, ip, hostname, os, status, risk)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(scanId, ip, hostname, osName, 'up', 'unknown');

  return Number(result.lastInsertRowid);
}

function upsertPort(hostId, port, protocol, service, version, state) {
  db.prepare(`
    INSERT OR IGNORE INTO ports (host_id, port, protocol, service, version, state)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(hostId, port, protocol, service, version, state);

  db.prepare(`
    UPDATE ports
    SET service = ?, version = ?, state = ?
    WHERE host_id = ? AND port = ? AND protocol = ?
  `).run(service, version, state, hostId, port, protocol);
}

const PORT_PROFILE_ARGS = {
  quick: ['--top-ports', '100'],
  standard: ['--top-ports', '1000'],
  full: ['-p', '-'],
};

async function runNmap(targets, scanId, portProfile = 'standard') {
  const targetList = [...new Set((Array.isArray(targets) ? targets : [targets]).filter(Boolean))];
  const selectedProfile = PORT_PROFILE_ARGS[portProfile] ? portProfile : 'standard';
  const pinned = new Map();
  for (const target of targetList) {
    for (const address of await assertScanTarget(scanId, target)) if (isIP(address) !== 6 && !pinned.has(address)) pinned.set(address, target);
  }
  if (!pinned.size) throw new Error('No approved IPv4 targets available for this nmap profile');
  const isFullScan = selectedProfile === 'full';
  logger.info(`[nmap] starting ${selectedProfile} scan on ${targetList.length} target(s)`);

  let xmlOutput = '';

  try {
    const execution = toolExecution('nmap');
    const { stdout } = await execa(execution.command, [
      '-Pn',
      '-n',
      '-sT',
      '-sV',
      '--version-light',
      ...PORT_PROFILE_ARGS[selectedProfile],
      '--open',
      '--host-timeout', isFullScan ? '10m' : '45s',
      '-oX', '-',
      ...pinned.keys(),
    ], {
      env: execution.env,
      timeout: isFullScan
        ? Math.min(900_000, 120_000 + (targetList.length * 30_000))
        : Math.min(300_000, 45_000 + (targetList.length * 8_000)),
    });

    xmlOutput = stdout;
  } catch (err) {
    if (err.stdout && String(err.stdout).includes('</nmaprun>')) {
      xmlOutput = err.stdout;
    } else {
      logger.error(`[nmap] FAILED to run real scan: ${err.code || err.message}`);
      if (err.timedOut) {
        throw new Error('nmap scan timed out before producing complete output');
      }
      throw new Error('nmap is not installed or not available in PATH');
    }
  }

  if (!xmlOutput.trim()) {
    return [];
  }

  const rawHosts = await parseNmapXml(xmlOutput);

  const results = [];

  for (const host of rawHosts) {
    const original = pinned.get(host.ip);
    if (original && !original.includes('/')) host.hostname = original;
    const hostId = upsertHost(scanId, host.ip, host.hostname, host.os);
    for (const port of host.ports) {
      upsertPort(hostId, port.port, port.protocol, port.service, port.version, port.state);
    }
    results.push({ ...host, hostId });
  }

  logger.info(`[nmap] found ${results.length} live hosts`);
  return results;
}

export { runNmap };
