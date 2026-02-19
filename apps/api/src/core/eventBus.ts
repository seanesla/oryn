import type { SessionArtifacts } from "@oryn/shared";
import type { SessionEventBus } from "./types";

export function createSessionEventBus(): SessionEventBus {
  const listeners = new Map<string, Set<(session: SessionArtifacts) => void>>();

  return {
    publish(sessionId, session) {
      const set = listeners.get(sessionId);
      if (!set) return;
      for (const fn of set) fn(session);
    },
    subscribe(sessionId, fn) {
      const set = listeners.get(sessionId) ?? new Set();
      set.add(fn);
      listeners.set(sessionId, set);

      return () => {
        const current = listeners.get(sessionId);
        if (!current) return;
        current.delete(fn);
        if (current.size === 0) listeners.delete(sessionId);
      };
    },
  };
}
