import type { SessionArtifacts, SessionConstraints, SessionMode } from "@oryn/shared";

export function defaultConstraints(): SessionConstraints {
  return {
    sourceConstraints: ["prefer_primary"],
    diversityTarget: "medium",
    maxCitations: 5,
    showLowConfidence: true,
    noCommentaryMode: false,
  };
}

export function makeEmptySession(input: {
  sessionId: string;
  createdAtMs: number;
  mode: SessionMode;
  url?: string;
  title?: string;
  constraints?: SessionConstraints;
}): SessionArtifacts {
  return {
    sessionId: input.sessionId,
    createdAtMs: input.createdAtMs,
    mode: input.mode,
    url: input.url,
    title: input.title,
    domain: undefined,
    constraints: input.constraints ?? defaultConstraints(),
    pipeline: {
      contentExtracted: false,
      claimsExtracted: false,
      evidenceBuilding: false,
    },
    wsState: "offline",
    latencyMs: { current: 0, p50: 0 },
    transcript: [],
    evidenceCards: [],
    clusters: [],
    choiceSet: [],
    trace: { toolCalls: [], cardInputs: {} },
    epistemic: {
      unsupportedClaims: 0,
      citationsUsed: 0,
    },
  };
}
