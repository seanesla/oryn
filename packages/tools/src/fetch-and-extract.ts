/**
 * Fetches a URL and extracts clean text + representative quotes.
 */

import { validateFetchUrl } from "./url-guard";

export type ExtractedContent = {
  title?: string;
  text: string;
  quotes: string[];
};

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeRetrievedText(text: string): string {
  return text
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "[removed]")
    .replace(/system\s+prompt/gi, "[removed]")
    .replace(/you\s+are\s+chatgpt/gi, "[removed]")
    .trim();
}

const MAX_RESPONSE_BYTES = 524_288; // 512 KB

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "user-agent": "oryn-hackathon/0.1 (+https://github.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchFollowingSafeRedirects(
  url: string,
  timeoutMs: number,
  maxRedirects = 3,
): Promise<Response> {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const res = await fetchWithTimeout(current, timeoutMs);
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect with no Location header");
      const next = new URL(location, current).href;
      await validateFetchUrl(next);
      current = next;
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects");
}

/**
 * Fetches a URL, strips HTML, sanitizes against prompt injection,
 * and returns clean text with representative quotes.
 */
export async function fetchAndExtract(url: string, timeoutMs = 2_500): Promise<ExtractedContent> {
  await validateFetchUrl(url);
  const res = await fetchFollowingSafeRedirects(url, timeoutMs);

  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status}${res.statusText ? ` ${res.statusText}` : ""}`);
  }

  // Size cap: check Content-Length header first, then stream with limit
  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
    throw new Error(`Response too large: ${contentLength} bytes`);
  }

  // Stream with size cap
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      reader.cancel();
      throw new Error(`Response too large: exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const html = new TextDecoder().decode(merged);

  const title = (() => {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1]?.trim();
  })();

  const text = sanitizeRetrievedText(stripHtml(html));
  const sentences = splitSentences(text);
  const quotes = sentences
    .filter((s) => s.length >= 40)
    .slice(0, 8)
    .map((s) => clamp(s, 220));

  return { title, text, quotes };
}
