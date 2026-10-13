import { logger } from "../logger.js";
import { execa } from 'execa';
import db from '../db.js';

import { toolExecution } from '../toolExecution.js';

async function runSubfinder(domain, scanId) {
  logger.info(`[subfinder] enumerating subdomains for ${domain}`);

  let lines = [];

  try {
    const { stdout } = await execa('subfinder', [
      '-d', domain,
      '-silent',
      '-o', '/dev/stdout',
    ], {
      env: toolExecution('subfinder').env,
      timeout: 60_000,
    });

    lines = stdout.split('\n').map(line => line.trim()).filter(Boolean);
  } catch (err) {
    if (err.stdout) {
      lines = err.stdout.split('\n').map(line => line.trim()).filter(Boolean);
    } else {
      logger.error(`[subfinder] FAILED to run: ${err.code || err.message}`);
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
  logger.info(`[subfinder] found ${uniqueLines.length} subdomains`);
  return uniqueLines;
}

export { runSubfinder };
