#!/usr/bin/env node
import { parseArguments, usage } from './arguments.mjs';
let options;
try {
  options = parseArguments(process.argv.slice(2), process.env.PENTELLIGENCE_URL);
} catch (error) {
  console.error(error.message);
  console.error(usage);
  process.exit(1);
}
if (options.help) {
  console.log(usage);
  console.log('Requires a running backend. Use only targets you are authorized to test.');
  process.exit(0);
}
const { target, base, programId } = options;
const headers = { 'content-type': 'application/json' };
if (process.env.PENTELLIGENCE_ACCESS_TOKEN) headers['x-access-token'] = process.env.PENTELLIGENCE_ACCESS_TOKEN;

const session = await fetch(`${base}/api/session`, { method: 'POST', headers });
if (!session.ok) throw new Error(`session failed: ${session.status} ${await session.text()}`);
const sessionData = await session.json();
headers['x-workspace-token'] = sessionData.workspaceToken;
const response = await fetch(`${base}/api/recon/start`, {
  method: 'POST', headers,
  body: JSON.stringify({ target, programId, authorizationConfirmed: true, authorizationNote: 'CLI authorized scan' }),
});
const payload = await response.json();
if (!response.ok) throw new Error(payload.error || `scan failed: ${response.status}`);
console.log(`Scan #${payload.scanId} started for ${payload.target}`);
console.log(`Open ${base} to follow progress.`);
