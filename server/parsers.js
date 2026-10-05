import { parse } from 'csv-parse/sync';
import { parseStringPromise } from 'xml2js';
import { isIP } from 'node:net';

export function parseSqlmapCsv(csv, target) {
  const origin = new URL(target).origin;
  const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, max_record_size: 100000 });
  const results = new Map();
  for (const row of rows) {
    if (!row['Target URL'] || !row.Place || !row.Parameter || !/^[BEQSTU]+$/.test(row['Technique(s)'] || '') || row['Note(s)']?.trim()) continue;
    let url;
    try { url = new URL(row['Target URL']); } catch { continue; }
    if (url.origin !== origin) continue;
    const finding = { type: 'sqli', target: url.href, payload: `${row.Place}: ${row.Parameter}`, output: JSON.stringify(row), evidence: `sqlmap CSV match (${row['Technique(s)']}); independent confirmation required`, severity: 'HIGH', confidence: 'unconfirmed' };
    results.set(`${url.href}|${finding.payload}`, finding);
  }
  return [...results.values()];
}

export async function parseNmapXml(xml) {
  if (/<!ENTITY/i.test(xml)) throw new Error('XML entities are not accepted');
  const parsed = await parseStringPromise(xml, { explicitArray: false });
  const value = parsed?.nmaprun?.host;
  const array = value => value ? (Array.isArray(value) ? value : [value]) : [];
  return array(value).filter(host => host.status?.$?.state === 'up').flatMap(host => {
    const addresses = array(host.address);
    const ip = addresses.find(item => item?.$?.addrtype === 'ipv4')?.$?.addr || addresses.find(item => item?.$?.addrtype === 'ipv6')?.$?.addr;
    if (!isIP(ip || '')) return [];
    const ports = array(host.ports?.port).map(port => ({ port: Number(port?.$?.portid), protocol: port?.$?.protocol || 'tcp', state: port?.state?.$?.state || 'unknown', service: port?.service?.$?.name || '', version: port?.service?.$?.version || '' }))
      .filter(port => Number.isInteger(port.port) && port.port > 0 && port.port <= 65535 && port.state === 'open');
    return [{ ip, hostname: array(host.hostnames?.hostname)[0]?.$?.name || ip, os: array(host.os?.osmatch)[0]?.$?.name || 'Unknown', status: 'up', ports }];
  });
}
