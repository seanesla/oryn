export type SessionMode = "co-reading" | "claim-check";

export type WsState = "connected" | "reconnecting" | "offline";

export type DisagreementType =
  | "Factual"
  | "Causal"
  | "Definition"
  | "Values"
  | "Prediction";

export type Confidence = "High" | "Medium" | "Low";

export type SourceConstraint = "prefer_primary" | "prefer_local";
export type DiversityTarget = "low" | "medium" | "high";
export type MaxCitations = 3 | 5 | 8;

export type SessionConstraints = {
  sourceConstraints: Array<SourceConstraint>;
  diversityTarget: DiversityTarget;
  maxCitations: MaxCitations;
  showLowConfidence: boolean;
  noCommentaryMode: boolean;
};

export type TranscriptChunk = {
  id: string;
  speaker: "user" | "agent";
  text: string;
  timestampMs: number;
  isPartial?: boolean;
  turnId: string;
};

export type EvidenceQuote = {
  quote: string;
  url: string;
  title?: string;
  domain?: string;
};

export type EvidenceCard = {
  id: string;
  claimText: string;
  disagreementType: DisagreementType;
  confidence: Confidence;
  evidence: Array<EvidenceQuote>;
  counterEvidence: Array<EvidenceQuote>;
  pinned?: boolean;
  traceRef?: {
    toolCallIds: Array<string>;
  };
};

export type DisagreementCluster = {
  id: string;
  title: string;
  claimIds: Array<string>;
  representativeClaims: Array<string>;
  sources: Array<{ domain: string; count: number }>;
  whatsMissing: Array<string>;
};

export type ChoiceSetItem = {
  id: string;
  title: string;
  url: string;
  domain: string;
  frameLabel: string;
  reason: string;
  opensMissingFrame: boolean;
  isPrimarySource?: boolean;
};

export type TraceQuery = {
  id: string;
  timestampMs: number;
  queryText: string;
  constraintsApplied: Array<string>;
  resultsCount: number;
  selectedSourceDomains: Array<string>;
  selectionWhy: string;
};

export type Trace = {
  toolCalls: Array<TraceQuery>;
  cardInputs: Record<string, { toolCallIds: Array<string> }>;
};

export type PipelineState = {
  contentExtracted: boolean;
  claimsExtracted: boolean;
  evidenceBuilding: boolean;
};

export type SessionArtifacts = {
  sessionId: string;
  createdAtMs: number;
  mode: SessionMode;
  url?: string;
  domain?: string;
  title?: string;
  constraints: SessionConstraints;
  pipeline: PipelineState;
  wsState: WsState;
  latencyMs: { current: number; p50: number };

  transcript: Array<TranscriptChunk>;
  evidenceCards: Array<EvidenceCard>;
  clusters: Array<DisagreementCluster>;
  choiceSet: Array<ChoiceSetItem>;
  trace: Trace;

  epistemic: {
    unsupportedClaims: number;
    citationsUsed: number;
  };
};

export type SessionListItem = {
  sessionId: string;
  createdAtMs: number;
  mode: SessionMode;
  domain?: string;
  url?: string;
  claimsCount: number;
};
