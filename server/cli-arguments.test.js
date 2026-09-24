import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parseArguments } from '../bin/arguments.mjs';

test('CLI help succeeds without connecting to a backend', () => {
  for (const args of [[], ['--help'], ['-h']]) {
    const result = spawnSync(process.execPath, ['bin/pentelligence.mjs', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage:/);
  }
});
test('CLI rejects malformed commands before any network request', () => {
  for (const args of [ ['bad'], ['scan'], ['scan', 'a', 'b'], ['scan', 'a', '--wat'],
    ['scan', 'a', '--base'], ['scan', 'a', '--base', 'file:///tmp'],
    ['scan', 'a', '--base', 'https://user:secret@example.com'],
    ['scan', 'a', '--program', '0'], ['scan', 'a', '--program', '1.5'],
    ['scan', 'a', '--program', '1', '--program', '2'] ]) assert.throws(() => parseArguments(args));
});
test('CLI accepts option order and validates the environment URL', () => {
  assert.deepEqual(parseArguments(['scan', '--program', '12', 'example.com'], 'https://example.com/'), {
    target: 'example.com', programId: 12, base: 'https://example.com',
  });
  assert.throws(() => parseArguments(['scan', 'example.com'], 'bad'));
});
