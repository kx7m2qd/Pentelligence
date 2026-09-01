// Pure helpers for target / scope validation used by the recon pipeline.
// Dependency-free so they can be unit-tested with `node --test`.

/**
 * Normalize a user-supplied target into a bare hostname or IP.
 * Strips scheme, credentials, port and trailing path.
 */
export function normalizeTarget(raw) {
  if (typeof raw !== 'string') return '';
  let t = raw.trim();
  if (!t) return '';
  t = t.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, ''); // scheme
  t = t.replace(/^[^/@]*@/, '');                       // userinfo
  t = t.split('/')[0].split('?')[0].split('#')[0];    // path/query/fragment
  t = t.replace(/:\d+$/, '');                         // port (IPv4/host only)
  return t.toLowerCase();
}

/** Extract the registrable base domain (last two labels; three for common two-part TLDs). */
export function extractBaseDomain(host) {
  const h = normalizeTarget(host);
  if (!h || isIPv4(h)) return h;
  const TWO_PART_TLDS = new Set([
    'co.uk', 'org.uk', 'ac.uk', 'gov.uk',
    'com.au', 'net.au', 'org.au',
    'co.nz', 'org.nz',
    'com.br', 'com.mx',
    'co.in', 'co.jp', 'co.kr',
  ]);
  const labels = h.split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  if (TWO_PART_TLDS.has(lastTwo) && labels.length >= 3) {
    return labels.slice(-3).join('.');
  }
  return lastTwo;
}

function isIPv4(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

/**
 * Check whether a host is in scope against a list of scope entries.
 * Entries may be exact hosts, wildcard domains (*.example.com),
 * or IPv4 CIDR ranges (10.0.0.0/8).
 */
export function isHostInScope(host, scopeEntries) {
  const target = normalizeTarget(host);
  if (!target) return false;

  for (const raw of scopeEntries || []) {
    const entry = String(raw).trim().toLowerCase();
    if (!entry) continue;

    // Wildcard domain: *.example.com
    if (entry.startsWith('*.')) {
      const base = entry.slice(2);
      const t = extractBaseDomain(target);
      if (t === base) return true;
      continue;
    }

    // CIDR range
    if (entry.includes('/')) {
      if (ipInCidr(target, entry)) return true;
      continue;
    }

    // Exact host / domain match (a plain domain entry also matches subdomains)
    if (target === entry || target.endsWith(`.${entry}`)) return true;
  }
  return false;
}

/** IPv4 CIDR membership check. Returns false for anything non-IPv4. */
export function ipInCidr(ip, cidr) {
  const [base, prefixStr] = cidr.split('/');
  const prefix = Number(prefixStr);
  if (!isIPv4(base) || !isIPv4(ip) || !(prefix >= 0 && prefix <= 32)) return false;

  const toInt = (dotted) => dotted
    .split('.')
    .reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  return (toInt(ip) & mask) === (toInt(base) & mask);
}
