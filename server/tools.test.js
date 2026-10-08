import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBinary, getToolReadiness } from './tools.js';
import { toolExecution } from './toolExecution.js';

const nmap = { id: 'nmap', command: 'nmap', label: 'Nmap', required: true, versionArgs: ['--version'] };
test('aggregate readiness probes each binary instead of passing map indexes as runners', async () => {
  const result = await getToolReadiness(async (command, args) => ({ exitCode: 0, stdout: command === 'which' ? `/fixtures/${args[0]}` : 'fixture version' }));
  const binaries = result.tools.filter(tool => tool.id !== 'ai');
  assert.equal(binaries.length, 4);
  assert.ok(binaries.every(tool => tool.installed && tool.status === 'ready'));
});
test('readiness uses the same Nmap override and environment as execution', async () => {
  const env = { PATH: '/restricted', NMAP_PATH: '/custom/nmap' };
  const calls = [];
  const result = await checkBinary(nmap, async (...args) => {
    calls.push(args);
    return { exitCode: 0, stdout: calls.length === 1 ? '/custom/nmap\n' : 'Nmap version fixture\n' };
  }, env);
  assert.equal(result.installed, true);
  assert.equal(result.path, '/custom/nmap');
  assert.deepEqual(calls[0][1], ['/custom/nmap']);
  assert.equal(calls[1][0], '/custom/nmap');
  assert.deepEqual(calls[0][2].env, toolExecution('nmap', env).env);
  assert.deepEqual(calls[1][2].env, calls[0][2].env);
});
test('Homebrew paths match for subfinder and inherited paths remain for nuclei', () => {
  const env = { PATH: '/custom/bin' };
  assert.equal(toolExecution('subfinder', env).env.PATH, toolExecution('nmap', env).env.PATH);
  assert.match(toolExecution('subfinder', env).env.PATH, /\/opt\/homebrew\/bin/);
  assert.equal(toolExecution('nuclei', env).env.PATH, env.PATH);
});
test('missing tools are reported without attempting a version probe', async () => {
  let calls = 0;
  const result = await checkBinary(nmap, async () => { calls++; return { exitCode: 1, stdout: '' }; });
  assert.equal(result.installed, false);
  assert.equal(calls, 1);
});

test('a discovered binary with a failing version command is not ready', async () => {
  const result = await checkBinary(nmap, async command => command === 'which'
    ? { exitCode: 0, stdout: '/custom/nmap' }
    : { exitCode: 1, stdout: '', stderr: 'runtime unavailable' });
  assert.equal(result.installed, false);
  assert.equal(result.status, 'missing');
  assert.equal(result.path, '/custom/nmap');
  assert.match(result.recommendation, /version check failed/);
});

test('timed-out or blocked version probes do not report readiness', async () => {
  const result = await checkBinary(nmap, async command => {
    if (command === 'which') return { exitCode: 0, stdout: '/custom/nmap' };
    throw new Error('probe timed out');
  });
  assert.equal(result.installed, false);
  assert.equal(result.version, null);
});

test('successful version output on stderr is supported', async () => {
  const result = await checkBinary(nmap, async command => command === 'which'
    ? { exitCode: 0, stdout: '/custom/nmap' }
    : { exitCode: 0, stdout: '', stderr: 'Nmap fixture version' });
  assert.equal(result.installed, true);
  assert.equal(result.version, 'Nmap fixture version');
});
