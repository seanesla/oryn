"use client";

import type { SessionArtifacts, SessionConstraints, SessionListItem, SessionMode } from "@/lib/contracts";
import { apiFetch } from "@/lib/api";
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

export async function refreshSessions(limit = 10): Promise<Array<SessionListItem>> {
  const res = await apiFetch(`/v1/sessions?limit=${encodeURIComponent(String(limit))}`);
  const list = (await res.json()) as Array<SessionListItem>;
  const trimmed = list.slice(0, 10);

  // If the API uses an in-memory store (dev / restarted backend), it can
  // legitimately return an empty list even though the browser has local
  // history. Don't wipe local history in that case.
  if (trimmed.length === 0) {
    const cached = readJson<Array<SessionListItem>>(LIST_KEY, []).slice(0, 10);
    if (cached.length > 0) return cached;
  }

  writeJson(LIST_KEY, trimmed);
  return trimmed;
}

export function getSession(sessionId: string): SessionArtifacts | null {
  const map = readJson<Record<string, SessionArtifacts>>(SESSIONS_KEY, {});
  return map[sessionId] ?? null;
}

export async function fetchSession(sessionId: string): Promise<SessionArtifacts | null> {
  try {
    const res = await apiFetch(`/v1/sessions/${sessionId}`);
    const s = (await res.json()) as SessionArtifacts;
    upsertSession(s);
    return s;
  } catch {
    return null;
  }
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

export async function createSession(input: {
  mode: SessionMode;
  url?: string;
  title?: string;
  constraints?: SessionConstraints;
}): Promise<SessionArtifacts> {
  const constraints = input.constraints ?? defaultConstraints();
  const res = await apiFetch(`/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mode: input.mode,
      url: input.url,
      title: input.title,
      constraints,
    }),
  });
  const created = (await res.json()) as SessionArtifacts;
  upsertSession(created);
  return created;
}
