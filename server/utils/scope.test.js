import { test } from 'node:test';
import assert from 'node:assert/strict';

import { normalizeTarget, extractBaseDomain, isHostInScope, ipInCidr } from './scope.js';

test('normalizeTarget strips scheme, credentials, port and path', () => {
  assert.equal(normalizeTarget('https://example.com/login'), 'example.com');
  assert.equal(normalizeTarget('http://user:pass@example.com:8080'), 'example.com');
  assert.equal(normalizeTarget('example.com/query?a=1#frag'), 'example.com');
  assert.equal(normalizeTarget('  EXAMPLE.com '), 'example.com');
  assert.equal(normalizeTarget(''), '');
  assert.equal(normalizeTarget(null), '');
});

test('extractBaseDomain handles multi-part TLDs and non-domains', () => {
  assert.equal(extractBaseDomain('https://api.example.com'), 'example.com');
  assert.equal(extractBaseDomain('shop.co.uk'), 'shop.co.uk');
  assert.equal(extractBaseDomain('a.b.shop.co.uk'), 'shop.co.uk');
  assert.equal(extractBaseDomain('10.0.0.1'), '10.0.0.1');
  assert.equal(extractBaseDomain('localhost'), 'localhost');
});

test('ipInCidr validates IPv4 CIDR membership', () => {
  assert.equal(ipInCidr('10.1.2.3', '10.0.0.0/8'), true);
  assert.equal(ipInCidr('192.168.1.10', '192.168.1.0/24'), true);
  assert.equal(ipInCidr('11.0.0.1', '10.0.0.0/8'), false);
  assert.equal(ipInCidr('example.com', '10.0.0.0/8'), false);
  assert.equal(ipInCidr('10.0.0.1', '10.0.0.0/0'), true);
  assert.equal(ipInCidr('10.0.0.99', '10.0.0.0/32'), false);
  assert.equal(ipInCidr('10.0.0.0', '10.0.0.0/32'), true);
});

test('isHostInScope matches exact hosts, wildcards and CIDRs', () => {
  const scope = ['example.com', '*.api.io', '10.0.0.0/8'];
  assert.equal(isHostInScope('example.com', scope), true);
  assert.equal(isHostInScope('sub.example.com', scope), true);
  assert.equal(isHostInScope('https://sub.example.com/x', scope), true);
  assert.equal(isHostInScope('x.api.io', scope), true);
  assert.equal(isHostInScope('10.1.2.3', scope), true);
  assert.equal(isHostInScope('notexample.com', scope), false);
  assert.equal(isHostInScope('evil.com', scope), false);
  assert.equal(isHostInScope('', scope), false);
  assert.equal(isHostInScope('example.com', []), false);
});
