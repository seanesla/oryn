"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  ChoiceSetItem,
  SessionArtifacts,
  SessionConstraints,
  TranscriptChunk,
  WsState,
} from "@/lib/contracts";
import { makeInitialArtifacts } from "@/lib/mocks/fixtures";
import type { MockRuntimeActions } from "@/lib/mockStream";

function demoConstraints(): SessionConstraints {
  return {
    sourceConstraints: ["prefer_primary"],
    diversityTarget: "medium",
    maxCitations: 5,
    showLowConfidence: true,
    noCommentaryMode: false,
  };
}

function makeDemoSession(): SessionArtifacts {
  const constraints = demoConstraints();
  // Deterministic timestamps (avoid SSR hydration mismatch).
  const now = Date.UTC(2026, 1, 18, 18, 0, 0);

  const built = makeInitialArtifacts({
    sessionId: "landing_demo",
    url: "https://example.com/article/dispute",
    title: "Demo: Evidence-first co-reading",
    constraints,
  });

  const toolCalls: SessionArtifacts["trace"]["toolCalls"] = [
    {
      id: "tool_1",
      timestampMs: now - 5200,
      queryText: "define metric + scope (primary definitions first)",
      constraintsApplied: ["prefer primary sources", "max citations: 5", "diversity: medium"],
      resultsCount: 9,
      selectedSourceDomains: ["example.gov", "example.edu"],
      selectionWhy: "Definition before argument. Confirm what was actually measured.",
    },
    {
      id: "tool_2",
      timestampMs: now - 3600,
      queryText: "counter-frame + distributional effects",
      constraintsApplied: ["seek alternative frames", "max citations: 5"],
      resultsCount: 12,
      selectedSourceDomains: ["example.org"],
      selectionWhy: "Adds missing tradeoff lens and explicit counter-frame.",
    },
    {
      id: "tool_3",
      timestampMs: now - 2400,
      queryText: "series break + comparability notes",
      constraintsApplied: ["prefer primary sources", "date check"],
      resultsCount: 7,
      selectedSourceDomains: ["example.gov"],
      selectionWhy: "Checks whether the number can be compared to prior years.",
    },
  ];

  const allToolCallIds = toolCalls.map((t) => t.id);
  const cardInputs: Record<string, { toolCallIds: Array<string> }> = {};
  for (const c of built.evidenceCards) cardInputs[c.id] = { toolCallIds: allToolCallIds };

  const evidenceCards = built.evidenceCards.map((c) => ({
    ...c,
    traceRef: { toolCallIds: cardInputs[c.id]?.toolCallIds ?? [] },
  }));

  const citationsUsed = evidenceCards.reduce(
    (acc, c) => acc + c.evidence.length + c.counterEvidence.length,
    0
  );

  const transcript: Array<TranscriptChunk> = [
    {
      id: "t_1",
      speaker: "user",
      text: "Is this headline actually supported?",
      timestampMs: now - 6200,
      isPartial: false,
      turnId: "turn_user_1",
    },
    {
      id: "t_2",
      speaker: "agent",
      text: "I’m splitting this into definition, causality, and values — then attaching evidence cards.",
      timestampMs: now - 5900,
      isPartial: false,
      turnId: "turn_agent_1",
    },
    {
      id: "t_3",
      speaker: "agent",
      text: "First: what does the metric measure? If the definition drifts, the argument collapses.",
      timestampMs: now - 5480,
      isPartial: false,
      turnId: "turn_agent_2",
    },
    {
      id: "t_4",
      speaker: "user",
      text: "Show your retrieval trace and the strongest counter-frame.",
      timestampMs: now - 5100,
      isPartial: false,
      turnId: "turn_user_2",
    },
    {
      id: "t_5",
      speaker: "agent",
      text: "Done. You’ll see tool calls, constraints, and why sources were selected.",
      timestampMs: now - 4800,
      isPartial: false,
      turnId: "turn_agent_3",
    },
  ];

  return {
    sessionId: "landing_demo",
    createdAtMs: now - 7000,
    mode: "co-reading",
    url: "https://example.com/article/dispute",
    domain: built.domain ?? "example.com",
    title: built.title ?? "Demo",
    constraints,
    pipeline: {
      contentExtracted: true,
      claimsExtracted: true,
      evidenceBuilding: false,
    },
    wsState: "connected",
    latencyMs: { current: 46, p50: 62 },
    transcript,
    evidenceCards,
    clusters: built.clusters,
    choiceSet: built.choiceSet,
    trace: {
      toolCalls,
      cardInputs,
    },
    epistemic: {
      unsupportedClaims: 0,
      citationsUsed,
    },
  };
}

function jitterTag() {
  const pool = ["primary source", "opens a missing frame", "counter-frame", "definition drift", "date check"];
  return pool[Math.floor(Math.random() * pool.length)] ?? "counter-frame";
}

export function useLandingDemoSession() {
  const [session, setSession] = useState<SessionArtifacts>(() => makeDemoSession());

  const startAnalysis = useCallback(() => {
    // Landing demo is pre-populated.
  }, []);

  const setWsState = useCallback((wsState: WsState) => {
    setSession((prev) => ({ ...prev, wsState }));
  }, []);

  const togglePin = useCallback((cardId: string) => {
    setSession((prev) => ({
      ...prev,
      evidenceCards: prev.evidenceCards.map((c) => (c.id === cardId ? { ...c, pinned: !c.pinned } : c)),
    }));
  }, []);

  const regenerateChoiceSet = useCallback(() => {
    setSession((prev) => {
      const next: Array<ChoiceSetItem> = prev.choiceSet.map((i) => ({
        ...i,
        reason: `${i.reason} (regen: ${jitterTag()})`,
      }));
      return { ...prev, choiceSet: next.slice(0, 3) };
    });
  }, []);

  const updateConstraints = useCallback((constraints: SessionConstraints) => {
    setSession((prev) => ({ ...prev, constraints }));
  }, []);

  const exportSnapshot = useCallback((_format: "json" | "md") => {
    void _format;
    return undefined;
  }, []);

  const persist = useCallback((next: SessionArtifacts) => {
    setSession(next);
  }, []);

  const appendTranscript = useCallback((chunk: Omit<TranscriptChunk, "id"> & { id?: string }) => {
    setSession((prev) => ({
      ...prev,
      transcript: [
        ...prev.transcript,
        {
          ...chunk,
          id: chunk.id ?? (globalThis.crypto?.randomUUID?.() ?? `t_${Date.now()}`),
        } as TranscriptChunk,
      ],
    }));
  }, []);

  const actions = useMemo<MockRuntimeActions>(
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

  return { session, actions };
}
