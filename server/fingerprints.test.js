import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareFindings } from './fingerprints.js';
test('findings deduplicate and distinguish reappearing, fixed and higher-risk findings', () => {
  const f = { source: 'nuclei', template_id: 'example', hostname: 'example.com', score: 5 };
  assert.equal(compareFindings([], [f, f]).new.length, 1);
  assert.equal(compareFindings([], [f], [f]).regressed.length, 1);
  assert.equal(compareFindings([f], []).fixed.length, 1);
  assert.equal(compareFindings([f], [{ ...f, score: 9 }]).regressed.length, 1);
});
