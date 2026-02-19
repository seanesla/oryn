import type { SessionArtifacts, SessionListItem } from "@oryn/shared";

export type SessionStore = {
  create: (session: SessionArtifacts) => Promise<void>;
  get: (sessionId: string) => Promise<SessionArtifacts | null>;
  put: (session: SessionArtifacts) => Promise<void>;
  list: (limit: number) => Promise<Array<SessionListItem>>;
};

export type SessionEventBus = {
  publish: (sessionId: string, session: SessionArtifacts) => void;
  subscribe: (sessionId: string, fn: (session: SessionArtifacts) => void) => () => void;
};
