export function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  let normalized = value.trim().replace(' ', 'T');
  // SQLite CURRENT_TIMESTAMP has no suffix but is always UTC.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalized)) normalized += 'Z';
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatTimestamp(value, fallback = '—') {
  const date = parseTimestamp(value);
  return date ? date.toLocaleString(undefined, { timeZoneName: 'short' }) : fallback;
}
