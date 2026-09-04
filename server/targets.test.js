import test from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicResolution, normalizeTargetInput } from './targets.js';

test('normalizes domains and URL hostnames', () => {
  assert.deepEqual(normalizeTargetInput('Example.COM.'), { normalizedTarget: 'example.com', kind: 'hostname' });
  assert.deepEqual(normalizeTargetInput('https://example.com'), { normalizedTarget: 'example.com', kind: 'hostname' });
});

test('rejects URLs with paths, queries, and fragments', () => {
  assert.throws(() => normalizeTargetInput('https://example.com/admin'), /host, not a URL path/);
  assert.throws(() => normalizeTargetInput('https://example.com?next=1'), /query parameters/);
});

test('blocks local and private targets by default', () => {
  assert.throws(() => normalizeTargetInput('localhost'), /local-only/);
  assert.throws(() => normalizeTargetInput('192.168.1.4'), /private network/);
  assert.throws(() => normalizeTargetInput('10.0.0.0/24'), /private network/);
});

test('accepts explicitly enabled private IPv4 and CIDR targets', () => {
  assert.deepEqual(normalizeTargetInput('192.168.1.4', { allowPrivateTargets: true }), { normalizedTarget: '192.168.1.4', kind: 'ip' });
  assert.deepEqual(normalizeTargetInput('10.0.0.0/24', { allowPrivateTargets: true }), { normalizedTarget: '10.0.0.0/24', kind: 'cidr' });
});

test('requires a fully-qualified hostname', () => {
  assert.throws(() => normalizeTargetInput('internal-host'), /fully-qualified hostname/);
  assert.throws(() => normalizeTargetInput('bad host'), /fully-qualified hostname/);
});

test('allows explicit private resolution checks only when enabled', async () => {
  await assertPublicResolution('127.0.0.1', { allowPrivateTargets: true });
  await assert.rejects(() => assertPublicResolution('localhost'), /private or local|does not resolve/);
});
