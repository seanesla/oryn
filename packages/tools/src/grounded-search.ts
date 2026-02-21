import type { GoogleGenAI } from "@google/genai";

export type SearchHit = {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
};

export type SearchPlan = {
  queries: string[];
};

export type GroundedSearchResult = {
  hits: SearchHit[];
  resultsCount: number;
};

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function uniqByUrl(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });
}

/**
 * Executes a grounded search via Gemini Google Search tool.
 * Returns empty results when no GenAI client is available (no-credentials fallback).
 */
export async function groundedSearch(
  queryText: string,
  ai?: GoogleGenAI,
  model?: string,
): Promise<GroundedSearchResult> {
  if (!ai) return { hits: [], resultsCount: 0 };

  const modelId = model?.trim() || "gemini-2.0-flash";
  const resp = await ai.models.generateContent({
    model: modelId,
    contents: queryText,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const md: any = resp.candidates?.[0]?.groundingMetadata;
  const chunks: any[] = md?.groundingChunks ?? [];

  const hits: SearchHit[] = [];
  for (const c of chunks) {
    const web = c?.web;
    if (!web?.uri) continue;
    hits.push({
      title: web.title ?? web.uri,
      url: web.uri,
      domain: domainFromUrl(web.uri),
      snippet: undefined,
    });
  }

  return { hits: uniqByUrl(hits).slice(0, 12), resultsCount: chunks.length };
}

export { domainFromUrl };
