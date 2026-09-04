import net from "node:net";
import dns from "node:dns/promises";

const HOSTNAME_RE = /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const LOCAL_HOSTS = new Set(["localhost", "localhost.localdomain"]);

function isPrivateIPv4(ip) {
  const parts = ip.split(".").map(part => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

function normalizeHostname(value) {
  return value.toLowerCase().replace(/\.$/, "");
}

function isPrivateAddress(address) {
  if (net.isIP(address) === 4) return isPrivateIPv4(address);
  const value = address.toLowerCase();
  return value === '::1' || value.startsWith('fc') || value.startsWith('fd') || value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb');
}

export async function assertPublicResolution(target, options = {}) {
  if (options.allowPrivateTargets || net.isIP(target) || target.includes('/')) return;
  let addresses;
  try { addresses = await dns.lookup(target, { all: true, verbatim: true }); }
  catch { throw new Error(`target ${target} does not resolve`); }
  if (addresses.some(item => isPrivateAddress(item.address))) throw new Error(`target ${target} resolves to a private or local address`);
}

export async function filterPublicTargets(targets, options = {}) {
  if (options.allowPrivateTargets) return targets;
  const accepted = [];
  for (const target of targets) {
    try { await assertPublicResolution(target, options); accepted.push(target); }
    catch { /* Unresolvable and private discovered hosts are excluded. */ }
  }
  return accepted;
}

export function normalizeTargetInput(rawTarget, options = {}) {
  const allowPrivateTargets = Boolean(options.allowPrivateTargets);
  const value = String(rawTarget || "").trim();

  if (!value) {
    throw new Error("target is required");
  }

  let candidate = value;

  if (candidate.includes("://")) {
    let parsed;

    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error("target URL is invalid");
    }

    if (parsed.pathname && parsed.pathname !== "/") {
      throw new Error("target must be a host, not a URL path");
    }

    if (parsed.search || parsed.hash) {
      throw new Error("target must not include query parameters or fragments");
    }

    candidate = parsed.hostname;
  }

  if (candidate.includes("/") && !candidate.includes("://")) {
    const [host, prefix] = candidate.split("/");
    const prefixNum = Number.parseInt(prefix, 10);

    if (!host || prefix === undefined || prefixNum < 0 || prefixNum > 32 || net.isIP(host) !== 4) {
      throw new Error("CIDR targets must use a valid IPv4 range");
    }

    if (!allowPrivateTargets && isPrivateIPv4(host)) {
      throw new Error("private network targets are blocked by default");
    }

    return { normalizedTarget: `${host}/${prefixNum}`, kind: "cidr" };
  }

  if (net.isIP(candidate) === 4) {
    if (!allowPrivateTargets && isPrivateIPv4(candidate)) {
      throw new Error("private network targets are blocked by default");
    }

    return { normalizedTarget: candidate, kind: "ip" };
  }

  const hostname = normalizeHostname(candidate);

  if (LOCAL_HOSTS.has(hostname) || hostname.endsWith(".local")) {
    throw new Error("local-only targets are blocked");
  }

  if (!HOSTNAME_RE.test(hostname)) {
    throw new Error("target must be a fully-qualified hostname, IPv4 address, or CIDR");
  }

  return { normalizedTarget: hostname, kind: "hostname" };
}
