import { Type } from "@google/genai";

import type { FunctionDeclaration } from "@google/genai";
import type { SessionArtifacts } from "@oryn/shared";
import type { SessionEventBus, SessionStore } from "../core/types";
import { createGenAiClient } from "../genai/client";
import { runSessionAnalysis } from "../pipeline/analyze";
import {
  groundedSearch,
  fetchAndExtract,
  extractClaims,
  classifyDisagreement,
  buildEvidenceCards,
  optimizeChoiceSet,
} from "@oryn/tools";

export const liveFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: "oryn_get_evidence_pack",
    description:
      "Build or refresh evidence cards + choice set for the current session. Call this BEFORE making factual claims so you can cite evidence card ids and URLs.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus: {
          type: Type.STRING,
          description:
            "Optional focus, like 'strongest counter-frame', 'factual only', or 'definitions/measurement'.",
        },
      },
    },
  },
  {
    name: "oryn_grounded_search",
    description: "Search the web for sources matching a set of queries. Returns URLs, titles, and snippets.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        queries: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "One or more search queries (corroboration, counter-frame, primary-source).",
        },
      },
      required: ["queries"],
    },
  },
  {
    name: "oryn_fetch_and_extract",
    description: "Fetch a URL and extract clean text with representative quotes.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        url: {
          type: Type.STRING,
          description: "The URL to fetch and extract content from.",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "oryn_extract_claims",
    description: "Extract atomic claims from text and tag each with a disagreement type (Factual, Causal, Definition, Values, Prediction).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: "The text to extract claims from.",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "oryn_classify_disagreement",
    description: "Classify the disagreement type for claims by comparing against sources.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        claims: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Claim texts to classify.",
        },
      },
      required: ["claims"],
    },
  },
  {
    name: "oryn_build_evidence_cards",
    description: "Build evidence cards from claims and search results. Returns structured cards with evidence and counter-evidence.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        claims: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Claim texts to build cards for.",
        },
      },
      required: ["claims"],
    },
  },
  {
    name: "oryn_optimize_choice_set",
    description: "Select 3 optimal next-reads from evidence cards, maximizing frame coverage and domain diversity.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        refresh: {
          type: Type.BOOLEAN,
          description: "If true, regenerate the choice set even if one already exists.",
        },
      },
    },
  },
];

function trimEvidencePack(session: SessionArtifacts) {
  return {
    sessionId: session.sessionId,
    url: session.url,
    title: session.title,
    constraints: session.constraints,
    epistemic: session.epistemic,
    evidenceCards: session.evidenceCards.slice(0, 6).map((c) => ({
      id: c.id,
      claimText: c.claimText,
      disagreementType: c.disagreementType,
      confidence: c.confidence,
      evidence: c.evidence.slice(0, 2),
      counterEvidence: c.counterEvidence.slice(0, 2),
    })),
    clusters: session.clusters.slice(0, 6),
    choiceSet: session.choiceSet.slice(0, 3),
    trace: {
      toolCalls: session.trace.toolCalls.slice(-10),
      cardInputs: session.trace.cardInputs,
    },
  };
}

function getAi() {
  try {
    const { ai } = createGenAiClient();
    return ai;
  } catch {
    return undefined;
  }
}

export async function runLiveTool(input: {
  name: string;
  args: Record<string, unknown> | undefined;
  sessionId: string;
  store: SessionStore;
  bus: SessionEventBus;
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
}): Promise<Record<string, unknown>> {
  const { name, args, sessionId, store, bus, logger } = input;

  if (name === "oryn_get_evidence_pack") {
    const focus = typeof args?.focus === "string" ? args.focus : undefined;
    const current = await store.get(sessionId);
    if (!current) return { error: "Session not found" };

    if (!current.pipeline.evidenceBuilding && current.evidenceCards.length > 0) {
      return { ok: true, pack: trimEvidencePack(current) };
    }

    const built = await runSessionAnalysis({ sessionId, store, bus, logger, focus });
    if (!built) return { error: "Session not found" };
    return { ok: true, pack: trimEvidencePack(built) };
  }

  if (name === "oryn_grounded_search") {
    const queries = Array.isArray(args?.queries) ? (args.queries as string[]) : [];
    if (queries.length === 0) return { error: "queries array is required" };

    const ai = getAi();
    const model = (process.env.GEMINI_MODEL ?? "").trim() || undefined;
    const results = await Promise.all(
      queries.map((q) => groundedSearch(q, ai, model).catch(() => ({ hits: [], resultsCount: 0 }))),
    );
    return { ok: true, results };
  }

  if (name === "oryn_fetch_and_extract") {
    const url = typeof args?.url === "string" ? args.url : undefined;
    if (!url) return { error: "url is required" };

    try {
      const content = await fetchAndExtract(url);
      return { ok: true, content };
    } catch (err) {
      return { error: `Failed to fetch: ${err instanceof Error ? err.message : "unknown"}` };
    }
  }

  if (name === "oryn_extract_claims") {
    const text = typeof args?.text === "string" ? args.text : undefined;
    if (!text) return { error: "text is required" };

    const ai = getAi();
    const model = (process.env.GEMINI_MODEL ?? "").trim() || undefined;
    const claims = await extractClaims(text, ai, model);
    return { ok: true, claims };
  }

  if (name === "oryn_classify_disagreement") {
    const claimTexts = Array.isArray(args?.claims) ? (args.claims as string[]) : [];
    if (claimTexts.length === 0) return { error: "claims array is required" };

    const ai = getAi();
    const model = (process.env.GEMINI_MODEL ?? "").trim() || undefined;
    const claims = claimTexts.map((text) => ({ text, tag: "Factual" as const }));
    const session = await store.get(sessionId);
    const hits = session?.trace.toolCalls
      .flatMap((tc) => tc.selectedSourceDomains.map((d) => ({ title: d, url: `https://${d}`, domain: d })))
      ?? [];
    const classifications = await classifyDisagreement(claims, hits, ai, model);
    return { ok: true, classifications };
  }

  if (name === "oryn_build_evidence_cards") {
    const claimTexts = Array.isArray(args?.claims) ? (args.claims as string[]) : [];
    if (claimTexts.length === 0) return { error: "claims array is required" };

    const session = await store.get(sessionId);
    if (!session) return { error: "Session not found" };

    const cards = buildEvidenceCards({
      claimTexts,
      disagreementTypes: claimTexts.map(() => "Factual"),
      evidenceHits: [],
      counterHits: [],
      extractedByUrl: new Map(),
      sessionUrl: session.url,
      sessionTitle: session.title,
      toolCallIds: ["live", "live"],
    });
    return { ok: true, cards };
  }

  if (name === "oryn_optimize_choice_set") {
    const session = await store.get(sessionId);
    if (!session) return { error: "Session not found" };
    if (session.evidenceCards.length === 0) return { error: "No evidence cards yet. Call oryn_get_evidence_pack first." };

    const choiceSet = optimizeChoiceSet(session.evidenceCards, [], session.constraints);
    const next = { ...session, choiceSet };
    await store.put(next);
    bus.publish(sessionId, next);
    return { ok: true, choiceSet };
  }

  return { error: `Unknown tool: ${name}` };
}
