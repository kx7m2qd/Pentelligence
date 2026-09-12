import fs from 'fs';
import path from 'path';

// Pure helpers that assemble the nuclei CLI invocation. Kept free of db and
// process state so they can be unit-tested without network or binaries.

export function sanitizeTemplateTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .map(tag => String(tag).trim().toLowerCase())
      .filter(tag => /^[a-z0-9-]+$/.test(tag)),
  )].slice(0, 8);
}

// ctx = { templatesDir, templatesAvailable } so callers decide where the
// template library lives; tests inject a fake context.
export function buildNucleiArgs(target, options = {}, ctx = {}) {
  const { templatesDir = '', templatesAvailable = false } = ctx;
  const templateArgs = [];
  const tags = sanitizeTemplateTags(options.templateTags);

  if (options.cves?.length) {
    const cvesDir = path.join(templatesDir, 'cves');
    if (templatesAvailable && fs.existsSync(cvesDir)) {
      templateArgs.push('-t', cvesDir);
    }
    for (const cve of options.cves) {
      templateArgs.push('-id', cve.toLowerCase());
    }
  } else if (tags.length) {
    // Tags define the focus on their own; most takeover/exposure templates
    // are medium/low severity, so no severity filter in this mode.
  } else {
    templateArgs.push('-severity', 'critical,high');
  }

  if (tags.length) {
    templateArgs.push('-tags', tags.join(','));
  }

  const retries = Number.isInteger(options.retries) && options.retries >= 0 && options.retries <= 9
    ? String(options.retries)
    : '1';

  return [
    '-target', `https://${target}`,
    '-target', `http://${target}`,
    ...templateArgs,
    '-json',
    '-silent',
    '-no-color',
    '-timeout', '10',
    '-retries', retries,
    '-rate-limit', String(Math.min(200, Math.max(1, Number(options.rateLimit) || 50))),
  ];
}
