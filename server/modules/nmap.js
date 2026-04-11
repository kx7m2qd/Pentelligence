import { execa } from 'execa';
import { parseStringPromise } from 'xml2js';
import db from '../db.js';

async function runNmap(target, scanId) {
  console.log(`[nmap] starting scan on ${target}`);

  let xmlOutput = '';

  try {
    const { stdout } = await execa('nmap', [
      '-sT',           // TCP connect scan (no root needed)
      '-sV',           // service version detection
      '--open',        // only show open ports
      '-oX', '-',      // output XML to stdout
      '--script', 'banner',
      target
    ]);
    xmlOutput = stdout;
  } catch (err) {
    // nmap exits non-zero sometimes even on success
    if (err.stdout) {
      xmlOutput = err.stdout;
    } else {
      console.error(`[nmap] failed: ${err.message}`);
      console.error('[nmap] make sure nmap is installed: brew install nmap');
      return [];
    }
  }

  const parsed = await parseStringPromise(xmlOutput, { explicitArray: false });
  const nmapRun = parsed?.nmaprun;
  if (!nmapRun) {
    console.error('[nmap] no results returned');
    return [];
  }

  const rawHosts = nmapRun.host
    ? Array.isArray(nmapRun.host) ? nmapRun.host : [nmapRun.host]
    : [];

  const results = [];

  for (const h of rawHosts) {
    const status = h.status?.$?.state || 'unknown';
    if (status !== 'up') continue;

    // IP
    const addrs = Array.isArray(h.address) ? h.address : [h.address];
    const ipAddr = addrs.find(a => a?.$?.addrtype === 'ipv4')?.$?.addr || '';

    // Hostname
    const hostnameRaw = h.hostnames?.hostname;
    const hostname = hostnameRaw
      ? (Array.isArray(hostnameRaw) ? hostnameRaw[0]?.$?.name : hostnameRaw?.$?.name) || ipAddr
      : ipAddr;

    // OS
    const osMatch = h.os?.osmatch;
    const osName = osMatch
      ? (Array.isArray(osMatch) ? osMatch[0]?.$?.name : osMatch?.$?.name) || 'Unknown'
      : 'Unknown';

    // Ports
    const portList = h.ports?.port
      ? Array.isArray(h.ports.port) ? h.ports.port : [h.ports.port]
      : [];

    // Insert host into DB
    const hostRow = db.prepare(`
      INSERT INTO hosts (scan_id, ip, hostname, os, status, risk)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(scanId, ipAddr, hostname, osName, 'up', 'unknown');

    const hostId = hostRow.lastInsertRowid;
    const ports = [];

    for (const p of portList) {
      const portNum  = parseInt(p?.$?.portid || '0');
      const proto    = p?.$?.protocol || 'tcp';
      const state    = p?.state?.$?.state || 'unknown';
      const service  = p?.service?.$?.name || '';
      const version  = p?.service?.$?.version || '';

      db.prepare(`
        INSERT INTO ports (host_id, port, protocol, service, version, state)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(hostId, portNum, proto, service, version, state);

      ports.push({ port: portNum, protocol: proto, service, version, state });
    }

    results.push({ ip: ipAddr, hostname, os: osName, status: 'up', ports, hostId });
  }

  console.log(`[nmap] found ${results.length} live hosts`);
  return results;
}

export { runNmap };
