import { execa } from 'execa';
import db from '../db.js';

// requires subfinder installed: brew install subfinder

async function runSubfinder(domain, scanId) {
  console.log(`[subfinder] enumerating subdomains for ${domain}`);

  let lines = [];

  try {
    const { stdout } = await execa('subfinder', [
      '-d', domain,
      '-silent',
      '-o', '/dev/stdout'
    ]);
    lines = stdout.split('\n').map(l => l.trim()).filter(Boolean);
  } catch (err) {
    if (err.stdout) {
      lines = err.stdout.split('\n').map(l => l.trim()).filter(Boolean);
    } else {
      console.error(`[subfinder] failed: ${err.message}`);
      console.error('[subfinder] make sure subfinder is installed: brew install subfinder');
      return [];
    }
  }

  const insert = db.prepare(`
    INSERT INTO subdomains (scan_id, subdomain, source)
    VALUES (?, ?, ?)
  `);

  const insertMany = db.transaction(subs => {
    for (const s of subs) insert.run(scanId, s, 'subfinder');
  });

  insertMany(lines);

  console.log(`[subfinder] found ${lines.length} subdomains`);
  return lines;
}

export { runSubfinder };
