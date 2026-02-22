"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SessionArtifacts, SessionConstraints, TranscriptChunk, WsState } from "@/lib/contracts";
import { apiFetch } from "@/lib/api";
import { snapshotToMarkdown } from "@/lib/download";
import { getSessionToken, upsertSession } from "@/lib/sessions";
import type { Runtime, RuntimeActions } from "@/lib/runtimeTypes";

export function useSessionRuntime(sessionId: string) {
  const [runtime, setRuntime] = useState<Runtime>({ state: null, isBooting: true });
  const esRef = useRef<EventSource | null>(null);
  const sseEverConnectedRef = useRef(false);
  const sseTerminalErrorRef = useRef(false);
  const sseAuthCheckInFlightRef = useRef(false);
  const sseAuthCheckLastAtMsRef = useRef(0);
  const sseAuthProbeTimerRef = useRef<number | null>(null);

  const isLikelyUuid = useMemo(() => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId);
  }, [sessionId]);

  const persist = useCallback((next: SessionArtifacts) => {
    upsertSession(next);
    setRuntime((prev) => ({ state: next, isBooting: false, error: prev.error }));
  }, []);

  const setError = useCallback((error?: string) => {
    setRuntime((prev) => ({ ...prev, isBooting: false, error }));
  }, []);

  function formatLoadError(err: unknown): string {
    const raw = err instanceof Error ? err.message : "Failed to load session";
    if (raw.startsWith("API 401")) {
      return "Session access expired (API 401). If you restarted the backend, create a new session.";
    }
    if (raw.startsWith("API 403")) {
      return "You do not have access to this session (API 403).";
    }
    if (raw.startsWith("API 404")) {
      return "Session not found (API 404).";
    }
    return raw;
  }

  const mutate = useCallback((fn: (prev: SessionArtifacts) => SessionArtifacts) => {
    setRuntime((prev) => {
      if (!prev.state) return prev;
      const next = fn(prev.state);
      upsertSession(next);
      return { state: next, isBooting: false, error: prev.error };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let es: EventSource | null = null;
    sseEverConnectedRef.current = false;
    sseTerminalErrorRef.current = false;
    sseAuthCheckInFlightRef.current = false;
    sseAuthCheckLastAtMsRef.current = 0;
    if (sseAuthProbeTimerRef.current !== null) {
      window.clearTimeout(sseAuthProbeTimerRef.current);
      sseAuthProbeTimerRef.current = null;
    }
    // Avoid synchronous setState inside an effect body (eslint rule).
    Promise.resolve().then(() => {
      if (cancelled) return;
      setRuntime((prev) => ({ ...prev, isBooting: true, error: undefined }));
    });

    if (!isLikelyUuid) {
      Promise.resolve().then(() => {
        if (cancelled) return;
        setRuntime({ state: null, isBooting: false, error: "Invalid session id" });
      });
      return () => {
        cancelled = true;
        esRef.current?.close();
        esRef.current = null;
      };
    }

    const onState: EventListener = (ev) => {
      try {
        const e = ev as MessageEvent;
        const parsed = JSON.parse(String(e.data)) as unknown;
        if (!parsed || typeof parsed !== "object") return;
        const obj = parsed as { type?: unknown; session?: unknown };
        if (obj.type !== "session.state") return;
        persist(obj.session as SessionArtifacts);
      } catch {
        // ignore
      }
    };

    apiFetch(`/v1/sessions/${sessionId}`, { token: getSessionToken(sessionId) })
      .then((r) => r.json())
      .then((s: SessionArtifacts) => {
        if (cancelled) return;

        const tokenParam = getSessionToken(sessionId);
        // Treat wsState as the session transport state for SSE updates.
        // (The live-audio WebSocket maintains its own local UI state.)
        persist({ ...s, wsState: tokenParam ? "reconnecting" : "offline" });

        // SSE stream for session.state updates.
        if (!tokenParam) {
          setError("Missing session token. Live updates are disabled for this session.");
          return;
        }

        const sseUrl = `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787").replace(/\/$/, "")}/v1/sessions/${sessionId}/events?access_token=${encodeURIComponent(tokenParam)}`;
        const nextEs = new EventSource(sseUrl);
        es = nextEs;
        esRef.current = nextEs;

        nextEs.onopen = () => {
          if (cancelled) return;
          sseEverConnectedRef.current = true;
          sseTerminalErrorRef.current = false;
          if (sseAuthProbeTimerRef.current !== null) {
            window.clearTimeout(sseAuthProbeTimerRef.current);
            sseAuthProbeTimerRef.current = null;
          }
          setError(undefined);
          mutate((prev) => ({ ...prev, wsState: "connected" }));
        };
        nextEs.onerror = () => {
          if (cancelled) return;
          if (sseTerminalErrorRef.current) return;
          if (sseEverConnectedRef.current) {
            setError("Live updates disconnected. Reconnecting...");

            const now = Date.now();
            const msUntilNextProbe = Math.max(0, 5_000 - (now - sseAuthCheckLastAtMsRef.current));
            const shouldScheduleProbe =
              !sseAuthCheckInFlightRef.current && sseAuthProbeTimerRef.current === null;

            if (shouldScheduleProbe) {
              sseAuthProbeTimerRef.current = window.setTimeout(() => {
                sseAuthProbeTimerRef.current = null;
                if (cancelled) return;
                if (sseTerminalErrorRef.current) return;
                if (sseAuthCheckInFlightRef.current) return;

                sseAuthCheckInFlightRef.current = true;
                sseAuthCheckLastAtMsRef.current = Date.now();

                apiFetch(`/v1/sessions/${sessionId}`, { token: getSessionToken(sessionId) })
                  .catch((err: unknown) => {
                    if (cancelled) return;
                    const raw = err instanceof Error ? err.message : "";
                    if (!raw.startsWith("API 401") && !raw.startsWith("API 403") && !raw.startsWith("API 404")) return;
                    sseTerminalErrorRef.current = true;
                    setError(formatLoadError(err));
                    mutate((prev) => ({ ...prev, wsState: "offline" }));
                    try {
                      nextEs.close();
                    } catch {
                      // ignore
                    }
                  })
                  .finally(() => {
                    sseAuthCheckInFlightRef.current = false;
                  });
              }, msUntilNextProbe);
            }
          }
          mutate((prev) => ({ ...prev, wsState: "reconnecting" }));
        };

        nextEs.addEventListener("session.state", onState);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setRuntime({ state: null, isBooting: false, error: formatLoadError(err) });
      });

    return () => {
      cancelled = true;
      if (sseAuthProbeTimerRef.current !== null) {
        window.clearTimeout(sseAuthProbeTimerRef.current);
        sseAuthProbeTimerRef.current = null;
      }
      if (es) {
        es.removeEventListener("session.state", onState);
        es.close();
      }
      esRef.current = null;
    };
  }, [isLikelyUuid, mutate, persist, sessionId, setError]);

  const startAnalysis = useCallback(async () => {
    await apiFetch(`/v1/sessions/${sessionId}/analyze`, { method: "POST", token: getSessionToken(sessionId) });
  }, [sessionId]);

  const togglePin = useCallback(
    async (cardId: string) => {
      const res = await apiFetch(`/v1/sessions/${sessionId}/cards/${cardId}/pin`, { method: "POST", token: getSessionToken(sessionId) });
      const next = (await res.json()) as SessionArtifacts;
      persist(next);
    },
    [persist, sessionId]
  );

  const regenerateChoiceSet = useCallback(async () => {
    const res = await apiFetch(`/v1/sessions/${sessionId}/choice-set/regenerate`, { method: "POST", token: getSessionToken(sessionId) });
    const next = (await res.json()) as SessionArtifacts;
    persist(next);
  }, [persist, sessionId]);

  const updateConstraints = useCallback(
    async (constraints: SessionConstraints) => {
      const res = await apiFetch(`/v1/sessions/${sessionId}/constraints`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(constraints),
        token: getSessionToken(sessionId),
      });
      const next = (await res.json()) as SessionArtifacts;
      persist(next);
    },
    [persist, sessionId]
  );

  const exportSnapshot = useCallback(
    (format: "json" | "md") => {
      const s = runtime.state;
      if (!s) return undefined;
      if (format === "json") {
        return {
          filename: `oryn-session-${sessionId}.json`,
          mime: "application/json",
          content: JSON.stringify(s, null, 2),
        };
      }
      return {
        filename: `oryn-session-${sessionId}.md`,
        mime: "text/markdown",
        content: snapshotToMarkdown(s),
      };
    },
    [runtime.state, sessionId]
  );

  const setWsState = useCallback(
    (wsState: WsState) => {
      mutate((prev) => ({ ...prev, wsState }));
    },
    [mutate]
  );

  const appendTranscript = useCallback(
    async (chunk: Omit<TranscriptChunk, "id"> & { id?: string }) => {
      const toSend = {
        id: chunk.id,
        speaker: chunk.speaker,
        text: chunk.text,
        timestampMs: chunk.timestampMs,
        isPartial: chunk.isPartial,
        turnId: chunk.turnId,
      };
      const res = await apiFetch(`/v1/sessions/${sessionId}/transcript`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(toSend),
        token: getSessionToken(sessionId),
      });
      const next = (await res.json()) as SessionArtifacts;
      persist(next);
    },
    [persist, sessionId]
  );

  const actions: RuntimeActions = useMemo(
    () => ({
      startAnalysis,
      regenerateChoiceSet,
      togglePin,
      updateConstraints,
      exportSnapshot,
      setWsState,
      persist,
      appendTranscript,
    }),
    [
      appendTranscript,
      exportSnapshot,
      persist,
      regenerateChoiceSet,
      setWsState,
      startAnalysis,
      togglePin,
      updateConstraints,
    ]
  );

  return { runtime, actions };
}
