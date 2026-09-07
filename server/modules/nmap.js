import { execa } from 'execa';
import { parseStringPromise } from 'xml2js';
import db from '../db.js';

const BREW_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';
const NMAP_BINARY = process.env.NMAP_PATH || 'nmap';

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
  const isFullScan = selectedProfile === 'full';
  console.log(`[nmap] starting ${selectedProfile} scan on ${targetList.length} target(s)`);

  let xmlOutput = '';

  try {
    const { stdout } = await execa(NMAP_BINARY, [
      '-Pn',
      '-sT',
      '-sV',
      '--version-light',
      ...PORT_PROFILE_ARGS[selectedProfile],
      '--open',
      '--host-timeout', isFullScan ? '10m' : '45s',
      '-oX', '-',
      ...targetList,
    ], {
      env: { ...process.env, PATH: BREW_PATH },
      timeout: isFullScan
        ? Math.min(900_000, 120_000 + (targetList.length * 30_000))
        : Math.min(300_000, 45_000 + (targetList.length * 8_000)),
    });

    xmlOutput = stdout;
  } catch (err) {
    if (err.stdout && String(err.stdout).includes('</nmaprun>')) {
      xmlOutput = err.stdout;
    } else {
      console.error(`[nmap] FAILED to run real scan: ${err.code || err.message}`);
      if (err.timedOut) {
        throw new Error('nmap scan timed out before producing complete output');
      }
      throw new Error('nmap is not installed or not available in PATH');
    }
  }

  if (!xmlOutput.trim()) {
    return [];
  }

  const parsed = await parseStringPromise(xmlOutput, { explicitArray: false });
  const rawHosts = parsed?.nmaprun?.host
    ? Array.isArray(parsed.nmaprun.host) ? parsed.nmaprun.host : [parsed.nmaprun.host]
    : [];

  const results = [];

  for (const host of rawHosts) {
    if (host.status?.$?.state !== 'up') continue;

    const addresses = Array.isArray(host.address) ? host.address : [host.address];
    const ipAddress = addresses.find(item => item?.$?.addrtype === 'ipv4')?.$?.addr || '';
    const hostnameRaw = host.hostnames?.hostname;
    const hostname = hostnameRaw
      ? (Array.isArray(hostnameRaw) ? hostnameRaw[0]?.$?.name : hostnameRaw?.$?.name) || ipAddress
      : ipAddress;
    const osMatch = host.os?.osmatch;
    const osName = osMatch
      ? (Array.isArray(osMatch) ? osMatch[0]?.$?.name : osMatch?.$?.name) || 'Unknown'
      : 'Unknown';
    const portList = host.ports?.port
      ? Array.isArray(host.ports.port) ? host.ports.port : [host.ports.port]
      : [];

    const hostId = upsertHost(scanId, ipAddress, hostname, osName);
    const ports = [];

    for (const port of portList) {
      const portNum = Number.parseInt(port?.$?.portid || '0', 10);
      const protocol = port?.$?.protocol || 'tcp';
      const state = port?.state?.$?.state || 'unknown';
      const service = port?.service?.$?.name || '';
      const version = port?.service?.$?.version || '';

      upsertPort(hostId, portNum, protocol, service, version, state);
      ports.push({ port: portNum, protocol, service, version, state });
    }

    results.push({ ip: ipAddress, hostname, os: osName, status: 'up', ports, hostId });
  }

  console.log(`[nmap] found ${results.length} live hosts`);
  return results;
}

export { runNmap };
