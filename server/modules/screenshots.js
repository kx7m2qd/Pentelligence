import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import db from '../db.js';

const BROWSERS = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'];

async function findBrowser() {
  for (const candidate of BROWSERS) {
    try { await fs.access(candidate); return candidate; } catch { /* try next */ }
  }
  return null;
}

export async function captureScreenshots(scanId, assets, emitLog) {
  const browser = await findBrowser();
  if (!browser) { emitLog?.('[screenshots] no supported headless browser found — skipped'); return []; }
  const directory = path.join(process.cwd(), 'data', 'evidence', String(scanId));
  await fs.mkdir(directory, { recursive: true });
  const results = [];
  for (const asset of assets.slice(0, 50)) {
    const safeName = asset.hostname.replace(/[^a-z0-9.-]/gi, '_');
    const filePath = path.join(directory, `${safeName}.png`);
    const outcome = await execa(browser, ['--headless', '--disable-gpu', '--no-sandbox', `--window-size=1440,900`, `--screenshot=${filePath}`, asset.url], { reject: false, timeout: 20_000 });
    if (outcome.exitCode !== 0) { emitLog?.(`[screenshots] ${asset.hostname} — failed`); continue; }
    db.prepare('INSERT INTO evidence (scan_id, type, target, path, metadata_json) VALUES (?, ?, ?, ?, ?)').run(scanId, 'screenshot', asset.url, filePath, JSON.stringify({ hostname: asset.hostname }));
    results.push(filePath);
    emitLog?.(`[screenshots] ${asset.hostname} — captured`);
  }
  return results;
}
