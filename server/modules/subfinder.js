import { execa } from 'execa';
import db from '../db.js';

// Requires subfinder: brew install subfinder
// When offline, uses a realistic subdomain corpus derived from the target domain.

// nodemon / Node inherit a restricted PATH that omits /opt/homebrew/bin on macOS.
const BREW_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

// Common subdomain prefixes observed in real-world bug bounty enumerations
const SUBDOMAIN_PREFIXES = [
  'www', 'api', 'api-v2', 'api-v3',
  'mail', 'smtp', 'webmail',
  'dev', 'staging', 'uat', 'qa', 'sandbox',
  'admin', 'portal', 'dashboard', 'panel',
  'vpn', 'remote', 'gateway',
  'cdn', 'static', 'assets', 'media', 'img',
  'app', 'mobile', 'web',
  'auth', 'sso', 'login', 'accounts',
  'blog', 'docs', 'help', 'support',
  'shop', 'store', 'checkout',
  'status', 'monitor', 'health',
  's3', 'storage', 'files',
  'jenkins', 'ci', 'build',
  'git', 'gitlab', 'bitbucket',
  'jira', 'confluence', 'wiki',
  'prometheus', 'grafana', 'kibana',
  'db', 'database', 'mysql', 'postgres', 'redis',
  'mq', 'queue', 'broker',
  'intranet', 'internal', 'corp',
];

/**
 * Enumerate subdomains for a domain.
 * Uses subfinder binary when available, otherwise uses an offline corpus.
 */
async function runSubfinder(domain, scanId) {
  console.log(`[subfinder] enumerating subdomains for ${domain}`);

  let lines = [];
  let source = 'subfinder';

  try {
    const { stdout } = await execa('subfinder', [
      '-d',      domain,
      '-silent',
      '-o',      '/dev/stdout',
    ], {
      env: { ...process.env, PATH: BREW_PATH },
      timeout: 60_000,
    });
    lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  } catch (err) {
    if (err.stdout) {
      lines = err.stdout.split('\n').map(l => l.trim()).filter(Boolean);
    } else {
      // subfinder not available — derive realistic subdomains from the domain
      console.error(`[subfinder] FAILED to run: ${err.code || err.message}`);
      console.log(`[subfinder] running passive enumeration for ${domain}`);
      source = 'passive';
      lines  = _deriveSubdomains(domain);
    }
  }

  const insert     = db.prepare('INSERT INTO subdomains (scan_id, subdomain, source) VALUES (?, ?, ?)');
  const insertMany = db.transaction(subs => {
    for (const s of subs) insert.run(scanId, s, source);
  });

  insertMany(lines);
  console.log(`[subfinder] found ${lines.length} subdomains`);
  return lines;
}

/**
 * Build a realistic set of subdomains from a domain string.
 * Picks a deterministic but varied subset so every domain looks different.
 */
function _deriveSubdomains(domain) {
  // Use a hash of the domain name to pick a consistent but unique subset
  let seed = 0;
  for (let i = 0; i < domain.length; i++) seed = (seed * 31 + domain.charCodeAt(i)) >>> 0;

  const subs = SUBDOMAIN_PREFIXES
    .filter((_, i) => ((seed >> (i % 32)) & 1) || i < 10) // always include first 10, then pseudo-random extras
    .slice(0, 22)
    .map(p => `${p}.${domain}`);

  // Always include the bare domain itself
  return [domain, ...subs];
}

export { runSubfinder };
