import test from 'node:test';
import assert from 'node:assert/strict';
import { isInScope, matchesRule, parseRules } from './scope.js';

test('matches exact and wildcard scope rules', () => {
  assert.equal(matchesRule('example.com', 'example.com'), true);
  assert.equal(matchesRule('api.example.com', '*.example.com'), true);
  assert.equal(matchesRule('example.com', '*.example.com'), false);
});

test('exclusions always override scope rules', () => {
  assert.equal(isInScope('api.example.com', ['*.example.com'], ['api.example.com']), false);
  assert.equal(isInScope('www.example.com', ['*.example.com'], ['api.example.com']), true);
  assert.deepEqual(parseRules('example.com, *.example.com\nexample.com'), ['example.com', '*.example.com']);
});
