import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostSchema, parseAI } from './aiSchemas.js';
test('AI findings validate identifiers and types and clamp scores', () => {
  const input = { risk: 'high', cves: [{ id: 'CVE-2024-12345', title: 'Example', service: 'http', port: 443, score: 999, exploitable: true, description: 'Needs verification' }], attack_surface: [], recommended_next: 'manual', reasoning: 'Test' };
  assert.equal(parseAI(JSON.stringify(input), hostSchema).cves[0].score, 10);
  input.cves[0].id = 'invented';
  assert.throws(() => parseAI(JSON.stringify(input), hostSchema));
  assert.throws(() => parseAI('{bad json', hostSchema));
});
