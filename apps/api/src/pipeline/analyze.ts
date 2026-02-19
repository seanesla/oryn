import type { GoogleGenAI } from "@google/genai";

import type {
  DisagreementCluster,
  DisagreementType,
  EvidenceCard,
  EvidenceQuote,
  SessionArtifacts,
  TraceQuery,
} from "@oryn/shared";
import type { SessionEventBus, SessionStore } from "../core/types";
import { createGenAiClient } from "../genai/client";

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function nowId(prefix: string) {
  return `${prefix}_${Date.now()}`;
}

function splitSentences(text: string) {
  // Simple heuristic splitter; avoids pulling in heavy deps for the hackathon.
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some sites block default user agents.
        "user-agent": "oryn-hackathon/0.1 (+https://github.com)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    return res;
  } finally {
    clearTimeout(t);
  }
}

function stripHtml(html: string) {
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

function sanitizeRetrievedText(text: string) {
  // Lightweight prompt injection defense.
  // We treat retrieved text as hostile and strip common instruction-like phrases.
  return text
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, "[removed]")
    .replace(/system\s+prompt/gi, "[removed]")
    .replace(/you\s+are\s+chatgpt/gi, "[removed]")
    .trim();
}

async function mapLimit<T, R>(items: Array<T>, limit: number, fn: (item: T) => Promise<R>): Promise<Array<R>> {
  const out: Array<R> = [];
  const queue = [...items];
  const workers = Array.from({ length: Math.max(1, limit) }).map(async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) return;
      out.push(await fn(item));
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchAndExtract(url: string): Promise<{ title?: string; text: string; quotes: Array<string> }> {
  const res = await fetchWithTimeout(url, 2_500);
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

function clamp(s: string, max: number) {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function guessDisagreementType(claimText: string): DisagreementType {
  const c = claimText.toLowerCase();
  if (/(means|defined as|definition|metric|measured as)/.test(c)) return "Definition";
  if (/(will|forecast|expected|likely|projected|by \d{4})/.test(c)) return "Prediction";
  if (/(should|ought|fair|unfair|tradeoff|values|moral)/.test(c)) return "Values";
  if (/(cause|led to|due to|because|resulted in|impact|reduced|increased)/.test(c)) return "Causal";
  return "Factual";
}

type SearchHit = {
  title: string;
  url: string;
  snippet?: string;
  domain?: string;
};

async function groundedSearch(queryText: string): Promise<{ hits: Array<SearchHit>; resultsCount: number }> {
  let ai: GoogleGenAI;
  try {
    ai = createGenAiClient().ai;
  } catch {
    return { hits: [], resultsCount: 0 };
  }
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const resp = await ai.models.generateContent({
    model,
    contents: queryText,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const md: any = resp.candidates?.[0]?.groundingMetadata;
  const chunks: Array<any> = md?.groundingChunks ?? [];

  const hits: Array<SearchHit> = [];
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

  // Fall back: if no grounding chunks, try to at least surface the model text.
  if (hits.length === 0 && resp.text) {
    // no urls, so no hits.
  }

  return { hits: uniqByUrl(hits).slice(0, 12), resultsCount: chunks.length };
}

function uniqByUrl(hits: Array<SearchHit>) {
  const seen = new Set<string>();
  const out: Array<SearchHit> = [];
  for (const h of hits) {
    if (seen.has(h.url)) continue;
    seen.add(h.url);
    out.push(h);
  }
  return out;
}

function pickQuoteFromSnippetOrTitle(h: SearchHit) {
  return clamp(h.snippet ?? h.title ?? h.url, 220);
}

function confidenceFrom(evidenceCount: number, counterCount: number) {
  if (evidenceCount >= 1 && counterCount >= 1) return "Medium" as const;
  if (evidenceCount >= 1) return "Low" as const;
  return "Low" as const;
}

function buildClusters(cards: Array<EvidenceCard>): Array<DisagreementCluster> {
  const byType = new Map<DisagreementType, Array<EvidenceCard>>();
  for (const c of cards) {
    const arr = byType.get(c.disagreementType) ?? [];
    arr.push(c);
    byType.set(c.disagreementType, arr);
  }

  const clusters: Array<DisagreementCluster> = [];
  let idx = 1;
  for (const [t, arr] of byType.entries()) {
    const allDomains = arr
      .flatMap((c) => [...c.evidence, ...c.counterEvidence])
      .map((q) => q.domain)
      .filter(Boolean) as Array<string>;
    const counts = new Map<string, number>();
    for (const d of allDomains) counts.set(d, (counts.get(d) ?? 0) + 1);

    clusters.push({
      id: `cluster_${idx++}`,
      title:
        t === "Definition"
          ? "What terms and metrics mean"
          : t === "Causal"
            ? "Causal mechanism and confounders"
            : t === "Values"
              ? "Tradeoffs and priorities"
              : t === "Prediction"
                ? "Forecasts and uncertainty"
                : "What is factually true",
      claimIds: arr.map((c) => c.id),
      representativeClaims: arr.slice(0, 2).map((c) => c.claimText),
      sources: Array.from(counts.entries()).map(([domain, count]) => ({ domain, count })),
      whatsMissing: [
        "A primary-source definition or dataset link.",
        "An independent replication or third-party critique.",
      ],
    });
  }
  return clusters;
}

function calcCitationsUsed(cards: Array<EvidenceCard>) {
  return cards.reduce((acc, c) => acc + c.evidence.length + c.counterEvidence.length, 0);
}

export async function runSessionAnalysis(input: {
  sessionId: string;
  store: SessionStore;
  bus: SessionEventBus;
  focus?: string;
  logger: {
    info: (...args: Array<unknown>) => void;
    warn: (...args: Array<unknown>) => void;
    error: (...args: Array<unknown>) => void;
  };
}): Promise<SessionArtifacts | null> {
  const { sessionId, store, bus, logger } = input;
  const startMs = Date.now();

  const session = await store.get(sessionId);
  if (!session) return null;
  let extracted: Awaited<ReturnType<typeof fetchAndExtract>> | null = null;

  const update = async (fn: (prev: SessionArtifacts) => SessionArtifacts) => {
    const current = (await store.get(sessionId)) ?? session;
    const next = fn(current);
    await store.put(next);
    bus.publish(sessionId, next);
    return next;
  };

  // Mark pipeline start.
  await update((prev) => ({
    ...prev,
    pipeline: { ...prev.pipeline, evidenceBuilding: true },
    latencyMs: { current: 0, p50: 0 },
  }));

  // 1) Content extraction
  if (session.mode === "co-reading" && session.url) {
    extracted = await fetchAndExtract(session.url).catch(() => null);
    await update((prev) => ({
      ...prev,
      domain: domainFromUrl(prev.url ?? "") || prev.domain,
      title: prev.title ?? extracted?.title ?? prev.url,
      pipeline: { ...prev.pipeline, contentExtracted: true },
    }));
  }

  // 2) Claims extraction (heuristic for now)
  let baseText = session.title ?? session.url ?? "";
  if (extracted?.text) baseText = extracted.text;

  const claims = splitSentences(baseText).slice(0, 4);
  const claimTexts = claims.length > 0 ? claims : session.url ? ["What is missing or contested in this article?"] : [];

  await update((prev) => ({
    ...prev,
    pipeline: { ...prev.pipeline, claimsExtracted: true },
  }));

  // 3) Retrieval + evidence building
  const toolCalls: Array<TraceQuery> = [];
  const cardInputs: Record<string, { toolCallIds: Array<string> }> = {};

  const url = session.url;

  if (url && extracted) {
    toolCalls.push({
      id: nowId("tool"),
      timestampMs: Date.now(),
      queryText: `fetch_and_extract: ${url}`,
      constraintsApplied: ["timeout: 2500ms", "sanitize: on"],
      resultsCount: extracted.quotes.length,
      selectedSourceDomains: [domainFromUrl(url)].filter(Boolean),
      selectionWhy: "Extracts readable text and representative quotes for evidence cards.",
    });
  }
  const focus = input.focus?.trim();
  const focusSuffix = focus ? ` (focus: ${clamp(focus, 80)})` : "";
  const q1 = url
    ? `primary sources / methodology for: ${url}${focusSuffix}`
    : `primary sources for claim: ${claimTexts[0] ?? ""}${focusSuffix}`;
  const q2 = url
    ? `strongest counter-frame / critique for: ${url}${focusSuffix}`
    : `counter-evidence for claim: ${claimTexts[0] ?? ""}${focusSuffix}`;

  const t1Id = nowId("tool");
  const t2Id = nowId("tool");

  const [r1, r2] = await Promise.all([
    groundedSearch(q1).catch((err) => {
      logger.warn({ err }, "grounded search failed (q1)");
      return { hits: [], resultsCount: 0 };
    }),
    groundedSearch(q2).catch((err) => {
      logger.warn({ err }, "grounded search failed (q2)");
      return { hits: [], resultsCount: 0 };
    }),
  ]);

  toolCalls.push({
    id: t1Id,
    timestampMs: Date.now(),
    queryText: q1,
    constraintsApplied: [
      ...(session.constraints.sourceConstraints.includes("prefer_primary") ? ["prefer primary sources"] : []),
      `max citations: ${session.constraints.maxCitations}`,
      `diversity: ${session.constraints.diversityTarget}`,
    ],
    resultsCount: r1.resultsCount,
    selectedSourceDomains: r1.hits.slice(0, 4).map((h) => h.domain ?? domainFromUrl(h.url)).filter(Boolean),
    selectionWhy: "Primary definitions first, then independent methodological context.",
  });

  toolCalls.push({
    id: t2Id,
    timestampMs: Date.now(),
    queryText: q2,
    constraintsApplied: ["seek alternative frames", `max citations: ${session.constraints.maxCitations}`],
    resultsCount: r2.resultsCount,
    selectedSourceDomains: r2.hits.slice(0, 4).map((h) => h.domain ?? domainFromUrl(h.url)).filter(Boolean),
    selectionWhy: "Adds missing distribution lens and an explicit counter-frame.",
  });

  const maxCards = 4;
  const cards: Array<EvidenceCard> = [];

  // For higher-trust cards, try to fetch and extract a short passage from
  // the specific URLs we plan to cite.
  const urlsToExtract = uniqByUrl(
    [...r1.hits.slice(0, maxCards), ...r2.hits.slice(0, maxCards)].map((h) => ({
      title: h.title,
      url: h.url,
      domain: h.domain,
      snippet: h.snippet,
    }))
  )
    .map((h) => h.url)
    .filter(Boolean)
    .slice(0, maxCards * 2);

  const extractedByUrl = new Map<string, Awaited<ReturnType<typeof fetchAndExtract>>>();
  await mapLimit(urlsToExtract, 4, async (u) => {
    const ex = await fetchAndExtract(u).catch(() => null);
    if (ex) extractedByUrl.set(u, ex);
    toolCalls.push({
      id: nowId("tool"),
      timestampMs: Date.now(),
      queryText: `fetch_and_extract: ${u}`,
      constraintsApplied: ["timeout: 2500ms", "sanitize: on"],
      resultsCount: ex?.quotes.length ?? 0,
      selectedSourceDomains: [domainFromUrl(u)].filter(Boolean),
      selectionWhy: "Extracts a short passage for evidence cards.",
    });
    return true;
  });

  for (const [idx, cText] of claimTexts.slice(0, maxCards).entries()) {
    const disagreementType = guessDisagreementType(cText);
    const evidenceHits = r1.hits.slice(idx, idx + 1);
    const counterHits = r2.hits.slice(idx, idx + 1);

    const evidence: Array<EvidenceQuote> = evidenceHits.map((h) => {
      const ex = extractedByUrl.get(h.url);
      return {
        quote: clamp(ex?.quotes[0] ?? pickQuoteFromSnippetOrTitle(h), 220),
        url: h.url,
        title: ex?.title ?? h.title,
        domain: h.domain ?? domainFromUrl(h.url),
      };
    });

    const counterEvidence: Array<EvidenceQuote> = counterHits.map((h) => {
      const ex = extractedByUrl.get(h.url);
      return {
        quote: clamp(ex?.quotes[0] ?? pickQuoteFromSnippetOrTitle(h), 220),
        url: h.url,
        title: ex?.title ?? h.title,
        domain: h.domain ?? domainFromUrl(h.url),
      };
    });

    // Local fallback: if we have no grounded hits, use the article itself as the evidence surface.
    if (evidence.length === 0 && url) {
      evidence.push({
        quote: clamp(cText, 220),
        url,
        title: session.title,
        domain: domainFromUrl(url),
      });
    }
    if (counterEvidence.length === 0 && url) {
      counterEvidence.push({
        quote: "Missing frame: the article may omit relevant counter-evidence or alternative definitions.",
        url,
        title: session.title,
        domain: domainFromUrl(url),
      });
    }

    // Fallback for claim-check mode when grounding is unavailable.
    // Keep the epistemic contract intact by always attaching a URL.
    if (evidence.length === 0 && !url) {
      const q = `primary sources for claim: ${cText}`;
      evidence.push({
        quote: clamp(cText, 220),
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        title: `Search: ${clamp(q, 72)}`,
        domain: "google.com",
      });
    }
    if (counterEvidence.length === 0 && !url) {
      const q = `counter-evidence for claim: ${cText}`;
      counterEvidence.push({
        quote: "Missing frame: seek the strongest critique and alternative assumptions.",
        url: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        title: `Search: ${clamp(q, 72)}`,
        domain: "google.com",
      });
    }

    const id = `card_${idx + 1}`;
    cardInputs[id] = { toolCallIds: [t1Id, t2Id] };
    cards.push({
      id,
      claimText: clamp(cText, 180),
      disagreementType,
      confidence: confidenceFrom(evidence.length, counterEvidence.length),
      evidence,
      counterEvidence,
      pinned: idx === 0,
      traceRef: { toolCallIds: [t1Id, t2Id] },
    });
  }

  const clusters = buildClusters(cards);
  const citationsUsed = calcCitationsUsed(cards);

  const choice = [...r1.hits, ...r2.hits]
    .slice(0, 8)
    .map((h, i) => ({
      id: `next_${i + 1}`,
      title: h.title,
      url: h.url,
      domain: h.domain ?? domainFromUrl(h.url),
      frameLabel: i === 0 ? "Measurement / definitions" : i === 1 ? "Counter-frame" : "Corroboration",
      reason:
        i === 0
          ? "Clarifies definitions and measurement." 
          : i === 1
            ? "Adds an explicit critique or alternative frame." 
            : "Provides independent context to confirm or falsify the claim.",
      opensMissingFrame: i < 2,
      isPrimarySource: /\.(gov|edu)$/.test(h.domain ?? ""),
    }))
    .filter((x) => Boolean(x.url) && Boolean(x.domain));

  const choiceSet = choice.slice(0, 3);
  if (choiceSet.length < 3) {
    const fillQueries = [q1, q2, url ? `site:${domainFromUrl(url)} ${url}` : "corroborate claim with primary sources"];
    for (const q of fillQueries) {
      if (choiceSet.length >= 3) break;
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      choiceSet.push({
        id: `next_fallback_${choiceSet.length + 1}`,
        title: `Search: ${clamp(q, 72)}`,
        url: searchUrl,
        domain: "google.com",
        frameLabel: "Search / grounding",
        reason: "Fallback when grounded sources are unavailable in this environment.",
        opensMissingFrame: true,
        isPrimarySource: false,
      });
    }
  }

  const endMs = Date.now();
  const latency = endMs - startMs;

  const unsupportedClaims = cards.filter((c) => c.evidence.length === 0 || c.counterEvidence.length === 0).length;

  const final = await update((prev) => ({
    ...prev,
    evidenceCards: cards,
    clusters,
    choiceSet,
    trace: {
      toolCalls,
      cardInputs,
    },
    epistemic: {
      unsupportedClaims,
      citationsUsed,
    },
    latencyMs: { current: latency, p50: latency },
    pipeline: { ...prev.pipeline, evidenceBuilding: false },
  }));

  return final;
}
