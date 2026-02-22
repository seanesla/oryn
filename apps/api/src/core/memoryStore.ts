import type { SessionArtifacts } from "@oryn/shared";
import type { SessionStore } from "./types";

export function createMemorySessionStore(): SessionStore {
  const sessions = new Map<string, SessionArtifacts>();

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
  };
}
