"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ChoiceSetItem,
  TranscriptChunk,
  SessionArtifacts,
  SessionConstraints,
  WsState,
} from "@/lib/contracts";
import { makeInitialArtifacts } from "@/lib/mocks/fixtures";
import { getSession, upsertSession } from "@/lib/sessions";

type Runtime = {
  state: SessionArtifacts | null;
  isBooting: boolean;
  error?: string;
};

function median(values: Array<number>) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

export function useMockSessionRuntime(sessionId: string) {
  const [runtime, setRuntime] = useState<Runtime>(() => {
    const s = getSession(sessionId);
    if (!s) return { state: null, isBooting: false, error: "Session not found." };
    return { state: s, isBooting: false };
  });
  const latencyWindowRef = useRef<Array<number>>([58, 64, 71, 55, 62, 66]);
  const timersRef = useRef<Array<number>>([]);

  const persist = useCallback((next: SessionArtifacts) => {
    upsertSession(next);
    setRuntime({ state: next, isBooting: false });
  }, []);

  const mutate = useCallback(
    (fn: (prev: SessionArtifacts) => SessionArtifacts) => {
      setRuntime((prev) => {
        if (!prev.state) return prev;
        const next = fn(prev.state);
        upsertSession(next);
        return { state: next, isBooting: false };
      });
    },
    []
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  // Latency + ws state ambience
  useEffect(() => {
    if (!runtime.state) return;
    const interval = window.setInterval(() => {
      mutate((prev) => {
        const nextLatency = Math.max(18, Math.round(42 + Math.random() * 70));
        latencyWindowRef.current = [...latencyWindowRef.current, nextLatency].slice(-30);
        const p50 = median(latencyWindowRef.current);

        let wsState = prev.wsState;
        if (wsState === "connected" && Math.random() < 0.06) wsState = "reconnecting";
        else if (wsState === "reconnecting") wsState = "connected";

        return {
          ...prev,
          latencyMs: { current: nextLatency, p50 },
          wsState,
        };
      });
    }, 1600);

    return () => window.clearInterval(interval);
  }, [mutate, runtime.state]);

  const startAnalysis = useCallback(() => {
    if (!runtime.state) return;
    const current = getSession(sessionId);
    if (!current) return;
    if (current.pipeline.evidenceBuilding || current.evidenceCards.length > 0) return;

    mutate((prev) => ({
      ...prev,
      pipeline: {
        contentExtracted: false,
        claimsExtracted: false,
        evidenceBuilding: true,
      },
      wsState: "connected",
    }));

    const t1 = window.setTimeout(() => {
      mutate((prev) => ({
        ...prev,
        pipeline: { ...prev.pipeline, contentExtracted: true },
      }));
    }, 700);

    const t2 = window.setTimeout(() => {
      mutate((prev) => ({
        ...prev,
        pipeline: { ...prev.pipeline, claimsExtracted: true },
      }));
    }, 1250);

    const t3 = window.setTimeout(() => {
      mutate((prev) => {
        const built = makeInitialArtifacts({
          sessionId: prev.sessionId,
          url: prev.url,
          title: prev.title,
          constraints: prev.constraints,
        });

        const toolCalls = [
          {
            id: "tool_1",
            timestampMs: Date.now() - 2100,
            queryText: "corroborate key claim + metric definition",
            constraintsApplied: [
              prev.constraints.sourceConstraints.includes("prefer_primary")
                ? "prefer primary sources"
                : "",
              `max citations: ${prev.constraints.maxCitations}`,
              `diversity: ${prev.constraints.diversityTarget}`,
            ].filter(Boolean),
            resultsCount: 9,
            selectedSourceDomains: ["example.gov", "example.edu"],
            selectionWhy: "Primary definitions first, then independent methodological context.",
          },
          {
            id: "tool_2",
            timestampMs: Date.now() - 1550,
            queryText: "counter-frame + distributional effects",
            constraintsApplied: ["seek alternative frames", `max citations: ${prev.constraints.maxCitations}`],
            resultsCount: 12,
            selectedSourceDomains: ["example.org"],
            selectionWhy: "Adds missing distribution lens and an explicit counter-frame.",
          },
        ];

        const cardInputs: Record<string, { toolCallIds: Array<string> }> = {};
        for (const c of built.evidenceCards) {
          cardInputs[c.id] = { toolCallIds: ["tool_1", "tool_2"] };
        }

        const citationsUsed = built.evidenceCards.reduce(
          (acc, c) => acc + c.evidence.length + c.counterEvidence.length,
          0
        );

        const evidenceCards = built.evidenceCards.map((c) => ({
          ...c,
          traceRef: { toolCallIds: cardInputs[c.id]?.toolCallIds ?? [] },
        }));

        return {
          ...prev,
          domain: built.domain ?? prev.domain,
          title: built.title ?? prev.title,
          evidenceCards,
          clusters: built.clusters,
          choiceSet: built.choiceSet,
          trace: { toolCalls, cardInputs },
          epistemic: {
            unsupportedClaims: 0,
            citationsUsed,
          },
          pipeline: { ...prev.pipeline, evidenceBuilding: false },
        };
      });
    }, 2200);

    timersRef.current.push(t1, t2, t3);
  }, [mutate, runtime.state, sessionId]);

  const setWsState = useCallback(
    (wsState: WsState) => {
      mutate((prev) => ({ ...prev, wsState }));
    },
    [mutate]
  );

  const togglePin = useCallback(
    (cardId: string) => {
      mutate((prev) => ({
        ...prev,
        evidenceCards: prev.evidenceCards.map((c) =>
          c.id === cardId ? { ...c, pinned: !c.pinned } : c
        ),
      }));
    },
    [mutate]
  );

  const regenerateChoiceSet = useCallback(() => {
    mutate((prev) => {
      const jitter = () => (Math.random() > 0.5 ? "opens a missing frame" : "primary source");
      const next: Array<ChoiceSetItem> = prev.choiceSet.map((i) => ({
        ...i,
        reason: `${i.reason} (regen: ${jitter()})`,
      }));
      return { ...prev, choiceSet: next.slice(0, 3) };
    });
  }, [mutate]);

  const updateConstraints = useCallback(
    (constraints: SessionConstraints) => {
      mutate((prev) => ({ ...prev, constraints }));
    },
    [mutate]
  );

  const exportSnapshot = useCallback(
    (format: "json" | "md") => {
      const s = getSession(sessionId);
      if (!s) return;

      if (format === "json") {
        return {
          filename: `oryn-session-${sessionId}.json`,
          mime: "application/json",
          content: JSON.stringify(s, null, 2),
        };
      }

      const md = [
        `# oryn session ${sessionId}`,
        "",
        `- Mode: ${s.mode}`,
        s.url ? `- URL: ${s.url}` : "- URL: (none)",
        s.domain ? `- Domain: ${s.domain}` : "",
        s.title ? `- Title: ${s.title}` : "",
        `- Evidence cards: ${s.evidenceCards.length}`,
        `- Citations used: ${s.epistemic.citationsUsed}`,
        "",
        "## Evidence Cards",
        ...s.evidenceCards.flatMap((c) => [
          `### ${c.claimText}`,
          "",
          `- Dispute: ${c.disagreementType}`,
          `- Confidence: ${c.confidence}`,
          "",
          "Evidence:",
          ...c.evidence.map((e) => `- \\"${e.quote}\\" (${e.url})`),
          "",
          "Counter-evidence:",
          ...c.counterEvidence.map((e) => `- \\"${e.quote}\\" (${e.url})`),
          "",
        ]),
      ]
        .filter(Boolean)
        .join("\n");

      return {
        filename: `oryn-session-${sessionId}.md`,
        mime: "text/markdown",
        content: md,
      };
    },
    [sessionId]
  );

  const appendTranscript = useCallback(
    (chunk: Omit<TranscriptChunk, "id"> & { id?: string }) => {
      mutate((prev) => ({
        ...prev,
        transcript: [
          ...prev.transcript,
          {
            ...chunk,
            id: chunk.id ?? (globalThis.crypto?.randomUUID?.() ?? `t_${Date.now()}`),
          },
        ],
      }));
    },
    [mutate]
  );

  const actions = useMemo(
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

export type MockRuntimeActions = ReturnType<typeof useMockSessionRuntime>["actions"];
