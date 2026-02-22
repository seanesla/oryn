import type { SessionArtifacts } from "@oryn/shared";

export type SessionStore = {
  create: (session: SessionArtifacts) => Promise<void>;
  get: (sessionId: string) => Promise<SessionArtifacts | null>;
  put: (session: SessionArtifacts) => Promise<void>;
};

export type SessionEventBus = {
  publish: (sessionId: string, session: SessionArtifacts) => void;
  subscribe: (sessionId: string, fn: (session: SessionArtifacts) => void) => () => void;
};
