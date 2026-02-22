import { lookup } from "node:dns/promises";

const BLOCKED_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.google",
  "169.254.169.254",
]);

export function isPrivateIp(ip: string): boolean {
  // IPv4
  if (/^127\./.test(ip)) return true;
  if (/^10\./.test(ip)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (/^192\.168\./.test(ip)) return true;
  if (/^169\.254\./.test(ip)) return true;  // link-local
  if (ip === "0.0.0.0") return true;

  // IPv6
  if (ip === "::1") return true;
  if (ip === "::") return true;
  if (/^fe80:/i.test(ip)) return true; // link-local
  if (/^fc00:/i.test(ip) || /^fd[0-9a-f]{2}:/i.test(ip)) return true; // ULA
  // IPv4-mapped IPv6
  if (/^::ffff:/i.test(ip)) {
    const v4 = ip.replace(/^::ffff:/i, "");
    return isPrivateIp(v4);
  }

  return false;
}

export async function validateFetchUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  // Scheme check
  const allowHttp = process.env.ORYN_ALLOW_HTTP_FETCH === "true";
  if (url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) {
    throw new Error(`Blocked URL scheme: ${url.protocol}`);
  }

  // Embedded credentials
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  // Blocked hostnames
  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(`Blocked host: ${url.hostname}`);
  }

  // Literal IP check
  if (isPrivateIp(url.hostname)) {
    throw new Error(`Blocked private IP: ${url.hostname}`);
  }

  // DNS resolution check
  try {
    const results = await lookup(url.hostname, { all: true });
    for (const { address } of results) {
      if (isPrivateIp(address)) {
        throw new Error(`DNS resolved to private IP: ${address}`);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.startsWith("Blocked") || err.message.startsWith("DNS resolved")) throw err;
    }
    // DNS failures are OK — the fetch itself will fail
  }

  return url;
}
