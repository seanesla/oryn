import type { SessionArtifacts, SessionConstraints, TranscriptChunk, WsState } from "@/lib/contracts";

export type ExportedSnapshot = {
  filename: string;
  mime: string;
  content: string;
};

export type Runtime = {
  state: SessionArtifacts | null;
  isBooting: boolean;
  error?: string;
};

export type RuntimeActions = {
  startAnalysis: () => void | Promise<void>;
  regenerateChoiceSet: () => void | Promise<void>;
  togglePin: (cardId: string) => void | Promise<void>;
  updateConstraints: (constraints: SessionConstraints) => void | Promise<void>;
  exportSnapshot: (format: "json" | "md") => ExportedSnapshot | undefined;
  setWsState: (wsState: WsState) => void;
  persist: (next: SessionArtifacts) => void;
  appendTranscript: (chunk: Omit<TranscriptChunk, "id"> & { id?: string }) => void | Promise<void>;
};
