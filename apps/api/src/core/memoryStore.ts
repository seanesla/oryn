import type { SessionArtifacts, SessionListItem } from "@oryn/shared";
import type { SessionStore } from "./types";

export function createMemorySessionStore(): SessionStore {
  const sessions = new Map<string, SessionArtifacts>();

  function toListItem(s: SessionArtifacts): SessionListItem {
    return {
      sessionId: s.sessionId,
      createdAtMs: s.createdAtMs,
      mode: s.mode,
      domain: s.domain,
      url: s.url,
      claimsCount: s.evidenceCards.length,
    };
  }

  return {
    async create(session) {
      sessions.set(session.sessionId, session);
    },
    async get(sessionId) {
      return sessions.get(sessionId) ?? null;
    },
    async put(session) {
      sessions.set(session.sessionId, session);
    },
    async list(limit) {
      const list = Array.from(sessions.values())
        .sort((a, b) => b.createdAtMs - a.createdAtMs)
        .slice(0, limit)
        .map(toListItem);
      return list;
    },
  };
}
