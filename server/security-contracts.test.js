import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.PENTELLIGENCE_DB_PATH = ':memory:';
process.env.APP_PASSWORD = 'test-only-admin-password';
process.env.ANALYST_PASSWORD = 'test-only-analyst-password';
process.env.GROQ_API_KEY = '';
process.env.LOG_LEVEL = 'silent';
const { default: app } = await import('./app.js');
const { default: db, recoverInterruptedScans } = await import('./db.js');
const { createAccessSession, createWorkspace } = await import('./workspaces.js');
const { beginScanTask, endScanTask } = await import('./scanState.js');
const { config } = await import('./config.js');
const { assertScanTarget } = await import('./scanGuard.js');
const { auditTaskAdmission, scanCapacity } = await import('./security.js');
const session = createAccessSession(1);
const a = createWorkspace(session.id);
const b = createWorkspace(session.id);
const headers = workspace => ({ 'x-access-token': session.token, 'x-workspace-token': workspace.token });
const scan = Number(db.prepare("INSERT INTO scans(target,workspace_id,status) VALUES ('example.com',?,'done')").run(a.id).lastInsertRowid);
const host = Number(db.prepare("INSERT INTO hosts(scan_id,ip,hostname) VALUES (?,'192.0.2.1','example.com')").run(scan).lastInsertRowid);
db.prepare("INSERT INTO findings(scan_id,host_id,cve_id,title,severity,score) VALUES (?,?,'CVE-2024-12345','AI suggestion','CRITICAL',10)").run(scan, host);
const program = Number(db.prepare("INSERT INTO programs(workspace_id,name,scope_json) VALUES (?,'Example','[\"example.com\"]')").run(a.id).lastInsertRowid);
after(() => db.close());

test('workspace B cannot read or mutate A scans, findings, programs or exports', async () => {
  for (const endpoint of [`/recon/status/${scan}`, `/recon/report/${scan}`, `/recon/compare/${scan}`, `/recon/events/${scan}`, `/agent/findings/${scan}`, `/nuclei/findings/${scan}`, `/exploit/results/${scan}`, `/findings/reviews/${scan}`, `/exports/${scan}/sarif`]) {
    await request(app).get(`/api${endpoint}`).set(headers(b)).expect(404);
  }
  await request(app).delete(`/api/recon/scan/${scan}`).set(headers(b)).expect(404);
  await request(app).patch(`/api/programs/${program}`).set(headers(b)).send({ name: 'stolen' }).expect(404);
  const scans = await request(app).get('/api/recon/scans').set(headers(b)).expect(200);
  assert.deepEqual(scans.body.scans, []);
  const programs = await request(app).get('/api/programs').set(headers(b)).expect(200);
  assert.equal(JSON.stringify(programs.body).includes('Example'), false);
  const owned = await request(app).get(`/api/recon/status/${scan}`).set(headers(a)).expect(200);
  assert.equal(owned.body.scan.id, scan);
});
test('start rejects missing consent, private targets, out of scope and exhausted capacity', async () => {
  await request(app).post('/api/recon/start').set(headers(a)).send({ target: '8.8.8.8' }).expect(400);
  await request(app).post('/api/recon/start').set(headers(a)).send({ target: '127.0.0.1', authorizationConfirmed: true }).expect(400);
  await request(app).post('/api/recon/start').set(headers(a)).send({ target: '8.8.8.8', authorizationConfirmed: true, programId: program }).expect(403);
  beginScanTask(scan, 'test');
  try { await request(app).post('/api/recon/start').set(headers(a)).send({ target: '8.8.8.8', authorizationConfirmed: true }).expect(429); }
  finally { endScanTask(scan, 'test'); }
  const original = config.maxDailyScans;
  config.maxDailyScans = 1;
  db.prepare("INSERT INTO scan_events(scan_id,status,phase) VALUES (?,'running','queued')").run(scan);
  try { await request(app).post('/api/recon/start').set(headers(a)).send({ target: '8.8.8.8', authorizationConfirmed: true }).expect(429); }
  finally { config.maxDailyScans = original; }
});
test('standalone task admissions consume the workspace daily quota and retain attribution', () => {
  const workspace = createWorkspace(session.id);
  const original = config.maxDailyScans;
  config.maxDailyScans = 1;
  try {
    assert.equal(scanCapacity(workspace.id), null);
    auditTaskAdmission({ workspaceId: workspace.id, accessSessionId: session.id, requestId: 'fixture-request', body: { authorizationNote: 'Authorized fixture' } }, { id: scan, target: 'example.com' }, 'agent');
    assert.equal(scanCapacity(workspace.id), 'workspace daily scan quota reached');
    const event = db.prepare("SELECT * FROM audit_events WHERE workspace_id=? AND action='task.admitted'").get(workspace.id);
    assert.equal(event.target, 'example.com');
    assert.equal(event.actor_session_id, session.id);
  } finally { config.maxDailyScans = original; }
});
test('session ownership and analyst roles prevent privilege escalation', async () => {
  const analyst = createAccessSession(1, 'analyst');
  const workspace = createWorkspace(analyst.id);
  const auth = { 'x-access-token': analyst.token, 'x-workspace-token': workspace.token };
  await request(app).get('/api/recon/scans').set({ ...auth, 'x-workspace-token': a.token }).expect(401);
  await request(app).get('/api/recon/scans').set(auth).expect(200);
  await request(app).post('/api/programs').set(auth).send({ name: 'bad' }).expect(403);
  await request(app).post(`/api/exploit/run/${scan}`).set(auth).expect(403);
  await request(app).get('/api/admin/audit').set(auth).expect(403);
  await request(app).get('/api/admin/audit').set(headers(a)).expect(200);
});
test('audit is append-only and reports never count model suggestions as confirmed', async () => {
  const report = await request(app).get(`/api/recon/report/${scan}`).set(headers(a)).expect(200);
  assert.equal(report.body.meta.confirmedFindingCount, 0);
  assert.equal(report.body.meta.suggestedFindingCount, 1);
  assert.throws(() => db.prepare("UPDATE audit_events SET outcome='tampered'").run(), /append-only/);
  assert.throws(() => db.prepare('DELETE FROM audit_events').run(), /append-only/);
  const sarif = await request(app).get(`/api/exports/${scan}/sarif`).set(headers(a)).expect(200);
  assert.equal(sarif.body.version, '2.1.0');
  assert.equal(sarif.body.runs[0].results[0].level, 'note');
  await request(app).get(`/api/exports/${scan}/pdf`).set(headers(a)).expect('Content-Type', /pdf/).expect(200);
});
test('crash recovery records an interruption once and leaves completed scans alone', () => {
  const id = Number(db.prepare("INSERT INTO scans(target,workspace_id,status) VALUES ('example.org',?,'running')").run(a.id).lastInsertRowid);
  assert.equal(recoverInterruptedScans(), 1);
  assert.equal(db.prepare('SELECT status FROM scans WHERE id=?').get(id).status, 'error');
  assert.equal(db.prepare('SELECT status FROM scans WHERE id=?').get(scan).status, 'done');
  assert.equal(recoverInterruptedScans(), 0);
});

test('execution guard reasserts program ownership and scope; review requires owned finding and evidence', async () => {
  await assert.rejects(assertScanTarget(scan, 'other.example'), /outside/);
  db.prepare('UPDATE scans SET program_id=? WHERE id=?').run(program, scan);
  await assert.rejects(assertScanTarget(scan, '8.8.8.8'), /outside/);
  db.prepare('UPDATE scans SET program_id=NULL WHERE id=?').run(scan);
  const row = db.prepare('SELECT id FROM findings WHERE scan_id=?').get(scan);
  await request(app).patch(`/api/findings/confidence/${scan}/agent/${row.id}`).set(headers(b)).send({ confidence: 'confirmed', authorizationNote: 'Verified in synthetic test' }).expect(404);
  await request(app).patch(`/api/findings/confidence/${scan}/agent/${row.id}`).set(headers(a)).send({ confidence: 'confirmed' }).expect(400);
  await request(app).patch(`/api/findings/confidence/${scan}/agent/${row.id}`).set(headers(a)).send({ confidence: 'confirmed', authorizationNote: 'Verified in synthetic test' }).expect(200);
  assert.equal(db.prepare('SELECT confidence FROM findings WHERE id=?').get(row.id).confidence, 'confirmed');
  await request(app).patch(`/api/findings/reviews/${scan}/agent/99999`).set(headers(a)).send({ status: 'resolved' }).expect(404);
});

test('login derives role from credentials and rejects invalid or missing sessions', async () => {
  await request(app).post('/api/auth/login').send({ password: 'wrong', role: 'admin' }).expect(401);
  const analyst = await request(app).post('/api/auth/login').send({ password: process.env.ANALYST_PASSWORD, role: 'admin' }).expect(201);
  assert.equal(analyst.body.role, 'analyst');
  const admin = await request(app).post('/api/auth/login').send({ password: process.env.APP_PASSWORD }).expect(201);
  assert.equal(admin.body.role, 'admin');
  await request(app).get('/api/recon/scans').expect(401);
  const status = await request(app).get('/api/auth/status').set('x-access-token', analyst.body.accessToken).expect(200);
  assert.equal(status.body.authenticated, true);
  await request(app).post('/api/auth/logout').set('x-access-token', analyst.body.accessToken).expect(204);
  await request(app).get('/api/recon/scans').set({ 'x-access-token': analyst.body.accessToken, 'x-workspace-token': a.token }).expect(401);
});

test('owned SSE stream delivers a scoped snapshot and closes on disconnect', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const controller = new AbortController();
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/recon/events/${scan}`, { headers: headers(a), signal: controller.signal });
    assert.match(response.headers.get('content-type'), /text\/event-stream/);
    const reader = response.body.getReader();
    const chunk = new TextDecoder().decode((await reader.read()).value);
    assert.match(chunk, /event: scan/);
    assert.match(chunk, /example.com/);
    await reader.cancel();
  } finally {
    controller.abort();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
