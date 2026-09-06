import db from '../db.js';

function extractTitle(html) {
  return String(html || '').match(/<title[^>]*>([^<]{0,200})<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || '';
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: 'manual', signal: controller.signal, headers: { 'user-agent': 'Pentelligence/1.0 authorized-security-scan' } });
    const body = await response.text();
    const headers = Object.fromEntries(response.headers.entries());
    return {
      statusCode: response.status,
      title: extractTitle(body),
      server: response.headers.get('server') || '',
      contentType: response.headers.get('content-type') || '',
      contentLength: Number(response.headers.get('content-length')) || Buffer.byteLength(body),
      redirectUrl: response.headers.get('location') || '',
      responseTimeMs: Date.now() - started,
      headers,
      bodySample: body.slice(0, 4096),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runWebProbe(scanId, targets, emitLog) {
  const insert = db.prepare(`INSERT INTO web_assets (scan_id, hostname, url, status_code, title, server, content_type, content_length, redirect_url, response_time_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const assets = [];
  for (const hostname of [...new Set(targets)].slice(0, 200)) {
    let result = await probe(`https://${hostname}`);
    let url = `https://${hostname}`;
    if (!result) {
      url = `http://${hostname}`;
      result = await probe(url);
    }
    if (!result) {
      emitLog?.(`[web] ${hostname} — no HTTP response`);
      continue;
    }
    insert.run(scanId, hostname, url, result.statusCode, result.title, result.server, result.contentType, result.contentLength, result.redirectUrl, result.responseTimeMs);
    db.prepare('INSERT INTO evidence (scan_id, type, target, content, metadata_json) VALUES (?, ?, ?, ?, ?)').run(scanId, 'http-response', url, result.bodySample, JSON.stringify({ headers: result.headers, statusCode: result.statusCode }));
    assets.push({ hostname, url, ...result });
    emitLog?.(`[web] ${hostname} — ${result.statusCode} ${result.title || 'untitled'} (${result.responseTimeMs}ms)`);
  }
  return assets;
}
