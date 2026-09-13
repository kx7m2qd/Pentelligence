import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isStale, STALE_AFTER_DAYS } from './modules/templates.js';

test('missing timestamp counts as stale', () => {
  assert.equal(isStale(null), true);
  assert.equal(isStale(undefined), true);
});

test('fresh library is not stale', () => {
  const now = Date.now();
  assert.equal(isStale(now - 24 * 60 * 60 * 1000, now), false);
});

test('library older than the window is stale', () => {
  const now = Date.now();
  const eightDays = 8 * 24 * 60 * 60 * 1000;
  assert.equal(isStale(now - eightDays, now), true);
  assert.equal(STALE_AFTER_DAYS, 7);
});
