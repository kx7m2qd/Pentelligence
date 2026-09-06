#!/usr/bin/env node
const args = process.argv.slice(2);
const command = args.shift();
const valueFor = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

if (command !== 'scan' || !args[0]) {
  console.error('Usage: npm run pentelligence -- scan example.com [--base http://localhost:3001] [--program ID]');
  process.exit(1);
}

const target = args[0];
const base = (valueFor('--base') || process.env.PENTELLIGENCE_URL || 'http://localhost:3001').replace(/\/$/, '');
const headers = { 'content-type': 'application/json' };
if (process.env.PENTELLIGENCE_ACCESS_TOKEN) headers['x-access-token'] = process.env.PENTELLIGENCE_ACCESS_TOKEN;

const session = await fetch(`${base}/api/session`, { method: 'POST', headers });
if (!session.ok) throw new Error(`session failed: ${session.status} ${await session.text()}`);
const sessionData = await session.json();
headers['x-workspace-token'] = sessionData.workspaceToken;
const response = await fetch(`${base}/api/recon/start`, {
  method: 'POST', headers,
  body: JSON.stringify({ target, programId: valueFor('--program') ? Number(valueFor('--program')) : undefined, authorizationConfirmed: true, authorizationNote: 'CLI authorized scan' }),
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error || `scan failed: ${response.status}`);
console.log(`Scan #${payload.scanId} started for ${payload.target}`);
console.log(`Open ${base} to follow progress.`);
