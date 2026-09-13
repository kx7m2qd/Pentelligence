import fs from 'fs';
import path from 'path';
import { execa } from 'execa';

// Single source of truth for the nuclei template library location and its
// refresh state. The scan pipeline reads from here; the /api/templates
// endpoints expose status and a manual refresh trigger.

export const templatesDir = process.env.NUCLEI_TEMPLATES_DIR || path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  'nuclei-templates',
);

export const STALE_AFTER_DAYS = 7;

let updating = false;

export function templatesExist() {
  return fs.existsSync(templatesDir);
}

export function templatesLastUpdate() {
  try {
    return fs.statSync(templatesDir).mtime.toISOString();
  } catch {
    return null;
  }
}

// Pure so it can be unit-tested: no timestamp -> stale (never set up).
export function isStale(lastUpdateMs, nowMs = Date.now(), maxAgeDays = STALE_AFTER_DAYS) {
  if (!Number.isFinite(lastUpdateMs)) return true;
  return nowMs - lastUpdateMs > maxAgeDays * 24 * 60 * 60 * 1000;
}

export function templatesStatus() {
  return {
    dir: templatesDir,
    exists: templatesExist(),
    updating,
    lastUpdate: templatesLastUpdate(),
  };
}

export async function startUpdate() {
  if (updating) {
    return { started: false, reason: 'template update already running' };
  }

  updating = true;
  console.log(`[templates] updating nuclei templates into ${templatesDir} ...`);

  try {
    await execa('nuclei', ['-update-templates'], { reject: false });
    console.log('[templates] nuclei template update finished');
  } catch (err) {
    console.warn(`[templates] template update failed: ${err.message}`);
  } finally {
    updating = false;
  }

  return { started: true };
}

// Called once at server start: downloads the library on first run and
// refreshes it when older than STALE_AFTER_DAYS. Never blocks startup.
export function ensureTemplates() {
  const status = templatesStatus();

  if (!status.exists) {
    console.warn(`[templates] library missing at ${templatesDir} — downloading in the background`);
    void startUpdate();
    return;
  }

  if (isStale(fs.statSync(templatesDir).mtimeMs)) {
    console.log('[templates] library older than 7 days — refreshing in the background');
    void startUpdate();
  }
}
