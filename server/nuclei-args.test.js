import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNucleiArgs, sanitizeTemplateTags } from './nuclei-args.js';

const ctx = { templatesDir: '/tmp/no-such-templates', templatesAvailable: false };

test('default sweep uses critical,high severity and no tags', () => {
  const args = buildNucleiArgs('example.com', {}, ctx);
  assert.ok(args.includes('-severity'));
  assert.ok(args.includes('critical,high'));
  assert.ok(!args.includes('-tags'));
  assert.deepEqual(args.filter(a => a === '-target').length, 2);
  assert.ok(args.includes('https://example.com'));
  assert.ok(args.includes('http://example.com'));
});

test('template tags are sanitized, deduped and joined into one -tags arg', () => {
  const args = buildNucleiArgs('example.com', { templateTags: ['Takeover', 'cve', 'takeover', 'bad tag!', '<x>'] }, ctx);
  const tagsIndex = args.indexOf('-tags');
  assert.equal(args[tagsIndex + 1], 'takeover,cve');
  assert.ok(!args.includes('-severity'));
});

test('cve list produces one -id per cve', () => {
  const args = buildNucleiArgs('example.com', { cves: ['CVE-2024-1234', 'cve-2023-0001'] }, ctx);
  assert.equal(args.filter(a => a === '-id').length, 2);
  assert.ok(args.includes('cve-2024-1234'));
  assert.ok(args.includes('cve-2023-0001'));
});

test('cves and tags can be combined', () => {
  const args = buildNucleiArgs('example.com', { cves: ['CVE-2024-1234'], templateTags: ['cve'] }, ctx);
  assert.ok(args.includes('-tags'));
  assert.ok(args.includes('cve-2024-1234'));
});

test('rate limit is clamped and retries fall back to 1', () => {
  const args = buildNucleiArgs('example.com', { rateLimit: 9999 }, ctx);
  assert.equal(args[args.indexOf('-rate-limit') + 1], '200');
  const defaults = buildNucleiArgs('example.com', {}, ctx);
  assert.equal(defaults[defaults.indexOf('-rate-limit') + 1], '50');
  assert.equal(defaults[defaults.indexOf('-retries') + 1], '1');
});

test('retries accepts 0 for the fast profile', () => {
  const args = buildNucleiArgs('example.com', { retries: 0 }, ctx);
  assert.equal(args[args.indexOf('-retries') + 1], '0');
});

test('sanitizeTemplateTags drops invalid entries and caps at 8', () => {
  const tags = sanitizeTemplateTags(['A', 'b-c', 'd e', '', 'x'.repeat(40), 't1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9']);
  assert.ok(tags.every(tag => /^[a-z0-9-]+$/.test(tag)));
  assert.ok(tags.length <= 8);
});
