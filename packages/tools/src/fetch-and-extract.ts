/**
 * Fetches a URL and extracts clean text + representative quotes.
 */

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

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "oryn-hackathon/0.1 (+https://github.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetches a URL, strips HTML, sanitizes against prompt injection,
 * and returns clean text with representative quotes.
 */
export async function fetchAndExtract(url: string, timeoutMs = 2_500): Promise<ExtractedContent> {
  const res = await fetchWithTimeout(url, timeoutMs);
  const html = await res.text();
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
