import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScheduleInterval } from './scheduler.js';

test('schedule cadence accepts daily and weekly monitoring', () => {
  assert.equal(normalizeScheduleInterval(24), 24);
  assert.equal(normalizeScheduleInterval('168'), 168);
});

test('schedule cadence rejects aggressive or unsupported intervals', () => {
  assert.equal(normalizeScheduleInterval(1), null);
  assert.equal(normalizeScheduleInterval(48), null);
  assert.equal(normalizeScheduleInterval('bad'), null);
});
