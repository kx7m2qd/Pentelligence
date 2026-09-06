import { execa } from 'execa';
import db from '../db.js';

const BREW_PATH = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin';

async function runSubfinder(domain, scanId) {
  console.log(`[subfinder] enumerating subdomains for ${domain}`);

  let lines = [];

  try {
    const { stdout } = await execa('subfinder', [
      '-d', domain,
      '-silent',
      '-o', '/dev/stdout',
    ], {
      env: { ...process.env, PATH: BREW_PATH },
      timeout: 60_000,
    });

    lines = stdout.split('\n').map(line => line.trim()).filter(Boolean);
  } catch (err) {
    if (err.stdout) {
      lines = err.stdout.split('\n').map(line => line.trim()).filter(Boolean);
    } else {
      console.error(`[subfinder] FAILED to run: ${err.code || err.message}`);
      return [];
    }
  }

  const uniqueLines = [...new Set(lines)];
  const insert = db.prepare('INSERT OR IGNORE INTO subdomains (scan_id, subdomain, source) VALUES (?, ?, ?)');
  const insertMany = db.transaction(subdomains => {
    for (const subdomain of subdomains) {
      insert.run(scanId, subdomain, 'subfinder');
    }
  });

  insertMany(uniqueLines);
  console.log(`[subfinder] found ${uniqueLines.length} subdomains`);
  return uniqueLines;
}

export { runSubfinder };
