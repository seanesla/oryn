import { Type } from "@google/genai";

import type { FunctionDeclaration } from "@google/genai";
import type { SessionArtifacts } from "@oryn/shared";
import type { SessionEventBus, SessionStore } from "../core/types";
import { runSessionAnalysis } from "../pipeline/analyze";

export const liveFunctionDeclarations: Array<FunctionDeclaration> = [
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

export async function runLiveTool(input: {
  name: string;
  args: Record<string, unknown> | undefined;
  sessionId: string;
  store: SessionStore;
  bus: SessionEventBus;
  logger: {
    info: (...args: Array<unknown>) => void;
    warn: (...args: Array<unknown>) => void;
    error: (...args: Array<unknown>) => void;
  };
}): Promise<Record<string, unknown>> {
  const { name, args, sessionId, store, bus, logger } = input;

  if (name === "oryn_get_evidence_pack") {
    const focus = typeof args?.focus === "string" ? args.focus : undefined;
    const current = await store.get(sessionId);
    if (!current) return { error: "Session not found" };

    // If we already have cards and we're not mid-build, return them.
    if (!current.pipeline.evidenceBuilding && current.evidenceCards.length > 0) {
      return { ok: true, pack: trimEvidencePack(current) };
    }

    const built = await runSessionAnalysis({ sessionId, store, bus, logger, focus });
    if (!built) return { error: "Session not found" };
    return { ok: true, pack: trimEvidencePack(built) };
  }

  return { error: `Unknown tool: ${name}` };
}
