import { Firestore } from "@google-cloud/firestore";

import type { SessionArtifacts, SessionListItem } from "@oryn/shared";
import type { SessionStore } from "./types";

export function createFirestoreSessionStore(opts?: {
  projectId?: string;
  collection?: string;
}) {
  const projectId = opts?.projectId ?? process.env.GCP_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
  const collection = opts?.collection ?? process.env.FIRESTORE_SESSIONS_COLLECTION ?? "oryn_sessions";

  const db = new Firestore(projectId ? { projectId } : undefined);
  const col = db.collection(collection);

  const toListItem = (s: SessionArtifacts): SessionListItem => ({
    sessionId: s.sessionId,
    createdAtMs: s.createdAtMs,
    mode: s.mode,
    domain: s.domain,
    url: s.url,
    claimsCount: s.evidenceCards.length,
  });

  const store: SessionStore = {
    async create(session) {
      await col.doc(session.sessionId).create(session as any);
    },
    async get(sessionId) {
      const snap = await col.doc(sessionId).get();
      if (!snap.exists) return null;
      return snap.data() as SessionArtifacts;
    },
    async put(session) {
      await col.doc(session.sessionId).set(session as any, { merge: true });
    },
    async list(limit) {
      const snaps = await col.orderBy("createdAtMs", "desc").limit(limit).get();
      const out: Array<SessionListItem> = [];
      for (const d of snaps.docs) {
        const s = d.data() as SessionArtifacts;
        out.push(toListItem(s));
      }
      return out;
    },
  };

  return store;
}
