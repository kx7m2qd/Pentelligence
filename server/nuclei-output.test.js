import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { parseNucleiOutput } from './nuclei-output.js';

process.env.PENTELLIGENCE_DB_PATH = ':memory:';
process.env.LOG_LEVEL = 'silent';
const { default: db } = await import('./db.js');
const { runNuclei, runNucleiOnScan } = await import('./modules/nuclei.js');
const { isScanTaskActive } = await import('./scanState.js');
after(() => db.close());
const scanId = Number(db.prepare("INSERT INTO scans(target,status) VALUES ('fixture.example','done')").run().lastInsertRowid);
const hostId = Number(db.prepare("INSERT INTO hosts(scan_id,hostname,ip) VALUES (?,'fixture.example','192.0.2.1')").run(scanId).lastInsertRowid);
const host = { id: hostId, hostname: 'fixture.example' };
const hit = { 'template-id': 'fixture', info: { name: 'Synthetic match', severity: 'info' }, 'matched-at': 'https://fixture.example' };

test('successful empty output means no matches, not an execution failure', () => {
  assert.deepEqual(parseNucleiOutput({ exitCode: 0, stdout: '' }), []);
  assert.deepEqual(parseNucleiOutput({ exitCode: 0, stdout: JSON.stringify(hit) }), [hit]);
});
test('nonzero exits, signals and timeouts cannot be interpreted as clean results', () => {
  for (const result of [{ exitCode: 1 }, { exitCode: null, signal: 'SIGTERM' }, { exitCode: 0, timedOut: true }, { exitCode: 0, isCanceled: true }]) {
    assert.throws(() => parseNucleiOutput({ ...result, stdout: JSON.stringify(hit) }), /incomplete/);
  }
});
test('malformed or unexpected JSON output is explicitly inconclusive', () => {
  for (const stdout of ['not JSON', 'null', '{}', JSON.stringify(hit) + '\ninvalid']) {
    assert.throws(() => parseNucleiOutput({ exitCode: 0, stdout }), /incomplete/);
  }
});
test('failed execution never persists stdout as confirmed findings', async () => {
  const result = await runNuclei(host, scanId, {}, async () => ({ exitCode: 1, stdout: JSON.stringify(hit), stderr: 'invalid options' }));
  assert.match(result.error, /exit 1/);
  assert.deepEqual(result.results, []);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM nuclei_findings').get().count, 0);
});
test('missing executable is skipped, while successful results can be persisted', async () => {
  const missing = await runNuclei(host, scanId, {}, async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); });
  assert.equal(missing.skipped, true);
  const success = await runNuclei(host, scanId, {}, async () => ({ exitCode: 0, stdout: JSON.stringify(hit) }));
  assert.equal(success.results.length, 1);
});
test('host failures and unavailable scanners reject the phase and release task state', async () => {
  for (const outcome of [{ results: [], error: 'failure', skipped: false }, { results: [], error: 'missing', skipped: true }]) {
    const logs = [];
    await assert.rejects(runNucleiOnScan(scanId, message => logs.push(message), {}, {
      assertTarget: async () => {}, run: async () => outcome,
    }), /incomplete/);
    assert.equal(isScanTaskActive(scanId, 'nuclei'), false);
    assert.equal(logs.includes('[nuclei] Nuclei scan complete.'), false);
    assert.equal(logs.some(message => message.includes('no vulnerabilities confirmed')), false);
  }
});
test('a successful no-match phase completes and a hostless phase stays inconclusive', async () => {
  const logs = [];
  await runNucleiOnScan(scanId, message => logs.push(message), {}, {
    assertTarget: async () => {}, run: async () => ({ results: [], error: null, skipped: false }),
  });
  assert.ok(logs.includes('[nuclei] Nuclei scan complete.'));
  const empty = Number(db.prepare("INSERT INTO scans(target,status) VALUES ('empty.example','done')").run().lastInsertRowid);
  await assert.rejects(runNucleiOnScan(empty), /no hosts/);
  assert.equal(isScanTaskActive(empty, 'nuclei'), false);
});
