import type { SessionArtifacts, TraceQuery } from "@oryn/shared";
import {
  groundedSearch,
  fetchAndExtract,
  extractClaims,
  buildEvidenceCards,
  buildClusters,
  optimizeChoiceSet,
  domainFromUrl,
  clamp,
  TTLCache,
  validateFetchUrl,
} from "@oryn/tools";
import type { SearchHit, ExtractedContent } from "@oryn/tools";
import type { SessionEventBus, SessionStore } from "../core/types";
import { createGenAiClient } from "../genai/client";
import { readCachedExtraction, writeCachedExtraction } from "../core/storageCache";

let idSeq = 0;

function nowId(prefix: string) {
  idSeq += 1;
  return `${prefix}_${Date.now()}_${idSeq}`;
}

// Module-level caches for repeated analyses
const searchCache = new TTLCache<{ hits: SearchHit[]; resultsCount: number }>(5 * 60_000);
const extractCache = new TTLCache<ExtractedContent>(10 * 60_000);

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
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

function uniqByUrl(hits: SearchHit[]): SearchHit[] {
  const seen = new Set<string>();
  return hits.filter((h) => {
    if (seen.has(h.url)) return false;
    seen.add(h.url);
    return true;
  });
}

async function cachedSearch(queryText: string): Promise<{ hits: SearchHit[]; resultsCount: number }> {
  const cached = searchCache.get(queryText);
  if (cached) return cached;

  let ai;
  try {
    ai = createGenAiClient().ai;
  } catch {
    return { hits: [], resultsCount: 0 };
  }
  const model = (process.env.GEMINI_MODEL ?? "").trim() || undefined;
  const result = await groundedSearch(queryText, ai, model);
  searchCache.set(queryText, result);
  return result;
}

async function cachedFetchAndExtract(url: string): Promise<ExtractedContent | null> {
  // L1: in-memory TTL cache
  const cached = extractCache.get(url);
  if (cached) return cached;

  // L2: GCS persistent cache (if enabled)
  const gcsCached = await readCachedExtraction(url);
  if (gcsCached) {
    extractCache.set(url, gcsCached);
    return gcsCached;
  }

  // L3: live fetch
  const result = await fetchAndExtract(url).catch(() => null);
  if (result) {
    extractCache.set(url, result);
    writeCachedExtraction(url, result).catch(() => {}); // best-effort persist
  }
  return result;
}

export async function runSessionAnalysis(input: {
  sessionId: string;
  store: SessionStore;
  bus: SessionEventBus;
  focus?: string;
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}): Promise<SessionArtifacts | null> {
  const { sessionId, store, bus, logger } = input;
  const startMs = Date.now();

  const session = await store.get(sessionId);
  if (!session) return null;

  const update = async (fn: (prev: SessionArtifacts) => SessionArtifacts) => {
    const current = (await store.get(sessionId)) ?? session;
    const next = fn(current);
    await store.put(next);
    bus.publish(sessionId, next);
    return next;
  };

  // Mark pipeline start
  await update((prev) => ({
    ...prev,
    pipeline: { ...prev.pipeline, evidenceBuilding: true },
    latencyMs: { current: 0, p50: 0 },
  }));

  // 1) Content extraction
  let extracted: ExtractedContent | null = null;
  if (session.mode === "co-reading" && session.url) {
    extracted = await cachedFetchAndExtract(session.url);
    await update((prev) => ({
      ...prev,
      domain: domainFromUrl(prev.url ?? "") || prev.domain,
      title: prev.title ?? extracted?.title ?? prev.url,
      pipeline: { ...prev.pipeline, contentExtracted: true },
    }));
  } else {
    // claim-check mode: no URL to fetch — claim text IS the content
    await update((prev) => ({
      ...prev,
      pipeline: { ...prev.pipeline, contentExtracted: true },
    }));
  }

  // 2) Claims extraction (Gemini-powered with heuristic fallback)
  let baseText = session.title ?? session.url ?? "";
  if (extracted?.text) baseText = extracted.text;

  let ai;
  try {
    ai = createGenAiClient().ai;
  } catch {
    // No credentials — heuristic fallback
  }
  const model = (process.env.GEMINI_MODEL ?? "").trim() || undefined;
  const extractedClaims = await extractClaims(baseText, ai, model);
  const claimTexts = extractedClaims.length > 0
    ? extractedClaims.map((c) => c.text)
    : session.url
      ? ["What is missing or contested in this article?"]
      : [];
  const disagreementTypes = extractedClaims.map((c) => c.tag);

  await update((prev) => ({
    ...prev,
    pipeline: { ...prev.pipeline, claimsExtracted: true },
  }));

  // 3) Retrieval
  const toolCalls: TraceQuery[] = [];
  const cardInputs: Record<string, { toolCallIds: string[] }> = {};
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
    cachedSearch(q1).catch((err) => {
      logger.warn({ err }, "grounded search failed (q1)");
      return { hits: [] as SearchHit[], resultsCount: 0 };
    }),
    cachedSearch(q2).catch((err) => {
      logger.warn({ err }, "grounded search failed (q2)");
      return { hits: [] as SearchHit[], resultsCount: 0 };
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

  // 4) Extract from top hits
  const maxCards = 4;
  const candidateUrls = uniqByUrl([...r1.hits.slice(0, maxCards), ...r2.hits.slice(0, maxCards)])
    .map((h) => h.url)
    .filter(Boolean)
    .slice(0, maxCards * 2);

  const urlsToExtract: string[] = [];
  for (const u of candidateUrls) {
    try {
      await validateFetchUrl(u);
      urlsToExtract.push(u);
    } catch (err) {
      logger.warn({ url: u, err }, "skipping URL: SSRF validation failed");
    }
  }

  const extractedByUrl = new Map<string, ExtractedContent>();
  await mapLimit(urlsToExtract, 4, async (u) => {
    const ex = await cachedFetchAndExtract(u);
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

  // 5) Build evidence cards
  const cards = buildEvidenceCards({
    claimTexts: claimTexts.slice(0, maxCards),
    disagreementTypes,
    evidenceHits: r1.hits,
    counterHits: r2.hits,
    extractedByUrl,
    sessionUrl: url,
    sessionTitle: session.title,
    toolCallIds: [t1Id, t2Id],
  });

  for (const card of cards) {
    cardInputs[card.id] = { toolCallIds: [t1Id, t2Id] };
  }

  // 6) Build clusters
  const clusters = buildClusters(cards);
  const citationsUsed = cards.reduce((acc, c) => acc + c.evidence.length + c.counterEvidence.length, 0);

  // 7) Build choice set
  const choiceSet = optimizeChoiceSet(cards, [...r1.hits, ...r2.hits], session.constraints);

  const endMs = Date.now();
  const latency = endMs - startMs;
  const unsupportedClaims = cards.filter((c) => c.evidence.length === 0 || c.counterEvidence.length === 0).length;

  const final = await update((prev) => ({
    ...prev,
    evidenceCards: cards,
    clusters,
    choiceSet,
    trace: { toolCalls, cardInputs },
    epistemic: { unsupportedClaims, citationsUsed },
    latencyMs: { current: latency, p50: latency },
    pipeline: { ...prev.pipeline, evidenceBuilding: false },
  }));

  return final;
}
