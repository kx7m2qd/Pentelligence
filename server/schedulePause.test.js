import { test } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { schedulePauseHandler } from './schedulePause.js';

function fixture(t) {
  const db = new Database(':memory:');
  t.after(() => db.close());
  db.exec(`
    CREATE TABLE programs (id INTEGER, workspace_id INTEGER, scope_json TEXT);
    CREATE TABLE program_schedules (
      program_id INTEGER, workspace_id INTEGER, enabled INTEGER,
      next_run_at TEXT, updated_at TEXT, target TEXT, interval_hours INTEGER,
      last_status TEXT, last_scan_id INTEGER
    );
    INSERT INTO programs VALUES (1, 10, '["changed.example"]');
    INSERT INTO programs VALUES (2, 10, '[]');
    INSERT INTO program_schedules VALUES
      (1, 10, 1, '2099-01-01', '2000-01-01', 'unresolvable.invalid', 168, 'changes', 7);
  `);
  const row = () => db.prepare('SELECT * FROM program_schedules WHERE program_id = 1').get();
  const handler = schedulePauseHandler(db, program => ({
    ...program,
    schedule: db.prepare('SELECT * FROM program_schedules WHERE program_id = ? AND workspace_id = ?')
      .get(program.id, program.workspace_id) || null,
  }));
  const invoke = (body, workspaceId = 10, id = 1) => {
    const result = { status: 200, continued: false };
    const res = {
      status(code) { result.status = code; return this; },
      json(value) { result.body = value; return this; },
    };
    handler({ body, workspaceId, params: { id } }, res, () => { result.continued = true; });
    return result;
  };
  return { row, invoke };
}

test('pause bypasses target validation and preserves configuration and history', t => {
  const { row, invoke } = fixture(t);
  const before = row();
  // Stored target is non-resolving and outside current scope; draft is invalid.
  const result = invoke({ enabled: false, target: 'bad draft', intervalHours: 0 });
  assert.equal(result.status, 200);
  assert.equal(result.continued, false);
  const after = row();
  assert.equal(after.enabled, 0);
  assert.equal(after.next_run_at, null);
  assert.notEqual(after.updated_at, before.updated_at);
  for (const key of ['target', 'interval_hours', 'last_status', 'last_scan_id']) {
    assert.equal(after[key], before[key]);
  }
  assert.deepEqual(result.body.program.schedule, after);
  assert.equal(invoke({ enabled: false }).status, 200);
});

test('pause rejects another workspace without changing the schedule', t => {
  const { row, invoke } = fixture(t);
  const before = row();
  assert.equal(invoke({ enabled: false }, 99).status, 404);
  assert.deepEqual(row(), before);
});

test('malformed enabled values cannot accidentally pause a schedule', t => {
  const { row, invoke } = fixture(t);
  const before = row();
  for (const body of [undefined, {}, { enabled: 'false' }, { enabled: 0 }, { enabled: null }]) {
    assert.equal(invoke(body).status, 400);
    assert.deepEqual(row(), before);
  }
});

test('enabling continues to existing validation without mutating the schedule', t => {
  const { row, invoke } = fixture(t);
  const before = row();
  assert.equal(invoke({ enabled: true }).continued, true);
  assert.deepEqual(row(), before);
});

test('pausing a program without a schedule is an idempotent no-op', t => {
  const { invoke } = fixture(t);
  const result = invoke({ enabled: false }, 10, 2);
  assert.equal(result.status, 200);
  assert.equal(result.body.program.schedule, null);
});
