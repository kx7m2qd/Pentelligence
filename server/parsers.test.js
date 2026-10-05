import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSqlmapCsv, parseNmapXml } from './parsers.js';
test('sqlmap CSV ignores stdout claims, notes, and other origins', () => {
  const csv = 'Target URL,Place,Parameter,Technique(s),Note(s)\nhttps://example.com/?id=1,GET,id,B,\nhttps://example.com/?id=2,GET,id,B,false positive\nhttps://other.example/?id=1,GET,id,B,\n';
  const results = parseSqlmapCsv(csv, 'https://example.com');
  assert.equal(results.length, 1);
  assert.equal(results[0].confidence, 'unconfirmed');
  assert.deepEqual(parseSqlmapCsv('is vulnerable\n', 'https://example.com'), []);
  assert.throws(() => parseSqlmapCsv('a,b\n"unterminated', 'https://example.com'));
});
test('nmap fixtures support single/multiple/empty hosts and reject malformed XML', async () => {
  const host = '<host><status state="up"/><address addr="192.0.2.1" addrtype="ipv4"/><ports><port protocol="tcp" portid="443"><state state="open"/></port></ports></host>';
  assert.equal((await parseNmapXml(`<nmaprun>${host}</nmaprun>`))[0].ports[0].port, 443);
  assert.equal((await parseNmapXml(`<nmaprun>${host}${host}</nmaprun>`)).length, 2);
  assert.deepEqual(await parseNmapXml('<nmaprun/>'), []);
  await assert.rejects(parseNmapXml('<nmaprun>'));
  assert.deepEqual(await parseNmapXml('<nmaprun><host><status state="down"/></host></nmaprun>'), []);
  assert.deepEqual(await parseNmapXml('<nmaprun><host><status state="up"/></host></nmaprun>'), []);
});
