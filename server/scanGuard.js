import db from './db.js';
import { config } from './config.js';
import { assertPublicResolution } from './targets.js';
import { assertInScope, isInScope } from './scope.js';
import { BlockList, isIP } from 'node:net';

function inCidr(hostname, target) {
  if (!target.includes('/') || isIP(hostname) !== 4) return false;
  const [address, prefix] = target.split('/');
  const block = new BlockList();
  block.addSubnet(address, Number(prefix), 'ipv4');
  return block.check(hostname, 'ipv4');
}

export async function assertScanTarget(scanId, target) {
  const scan = db.prepare('SELECT * FROM scans WHERE id=?').get(scanId);
  if (!scan) throw new Error('scan not found');
  const hostname = target.includes('://') ? new URL(target).hostname : target;
  const program = scan.program_id ? db.prepare('SELECT * FROM programs WHERE id=? AND workspace_id=?').get(scan.program_id, scan.workspace_id) : null;
  if (scan.program_id && !program) throw new Error('scan program no longer exists');
  if (program) assertInScope(hostname, { scope: JSON.parse(program.scope_json), excludes: JSON.parse(program.excludes_json) });
  else if (!isInScope(hostname, [scan.target, `*.${scan.target}`], []) && !inCidr(hostname, scan.target)) throw new Error('target is outside the original investigation scope');
  return assertPublicResolution(hostname, { allowPrivateTargets: config.allowPrivateTargets });
}
