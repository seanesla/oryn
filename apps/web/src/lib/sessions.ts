"use client";

import type { SessionArtifacts, SessionConstraints, SessionListItem, SessionMode } from "@/lib/contracts";
import { readJson, writeJson } from "@/lib/storage";

const SESSIONS_KEY = "oryn:sessions:v1";
const LIST_KEY = "oryn:session_list:v1";

export function defaultConstraints(): SessionConstraints {
  return {
    sourceConstraints: ["prefer_primary"],
    diversityTarget: "medium",
    maxCitations: 5,
    showLowConfidence: true,
    noCommentaryMode: false,
  };
}

export function listSessions(): Array<SessionListItem> {
  return readJson<Array<SessionListItem>>(LIST_KEY, []).slice(0, 10);
}

export function getSession(sessionId: string): SessionArtifacts | null {
  const map = readJson<Record<string, SessionArtifacts>>(SESSIONS_KEY, {});
  return map[sessionId] ?? null;
}

export function upsertSession(artifacts: SessionArtifacts) {
  const map = readJson<Record<string, SessionArtifacts>>(SESSIONS_KEY, {});
  map[artifacts.sessionId] = artifacts;
  writeJson(SESSIONS_KEY, map);

  const list = readJson<Array<SessionListItem>>(LIST_KEY, []);
  const claimsCount = artifacts.evidenceCards.length;
  const item: SessionListItem = {
    sessionId: artifacts.sessionId,
    createdAtMs: artifacts.createdAtMs,
    mode: artifacts.mode,
    domain: artifacts.domain,
    url: artifacts.url,
    claimsCount,
  };

  const without = list.filter((s) => s.sessionId !== artifacts.sessionId);
  writeJson(LIST_KEY, [item, ...without].slice(0, 10));
}

export function createSession(input: {
  mode: SessionMode;
  url?: string;
  title?: string;
  constraints?: SessionConstraints;
}): SessionArtifacts {
  const sessionId = globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}`;
  const createdAtMs = Date.now();
  const constraints = input.constraints ?? defaultConstraints();

  const artifacts: SessionArtifacts = {
    sessionId,
    createdAtMs,
    mode: input.mode,
    url: input.url,
    title: input.title,
    domain: undefined,
    constraints,
    pipeline: {
      contentExtracted: false,
      claimsExtracted: false,
      evidenceBuilding: false,
    },
    wsState: "connected",
    latencyMs: { current: 58, p50: 64 },
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

  upsertSession(artifacts);
  return artifacts;
}
