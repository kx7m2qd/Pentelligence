import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTimestamp, formatTimestamp } from '../src/utils/dates.js';

test('SQLite and timezone-qualified timestamps identify the same instant', () => {
  const expected = '2026-09-24T04:30:00.000Z';
  for (const value of ['2026-09-24 04:30:00', '2026-09-24T04:30:00Z', '2026-09-24T10:00:00+05:30']) {
    assert.equal(parseTimestamp(value).toISOString(), expected);
  }
});
test('date display handles missing and invalid timestamps', () => {
  for (const value of [null, undefined, '', 'invalid', 42]) {
    assert.equal(parseTimestamp(value), null);
    assert.equal(formatTimestamp(value, 'never'), 'never');
  }
});
