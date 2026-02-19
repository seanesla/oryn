import type { SessionArtifacts, SessionConstraints, SessionMode, TranscriptChunk } from "./contracts";

// REST
export type CreateSessionRequest = {
  mode: SessionMode;
  url?: string;
  claimText?: string;
  title?: string;
  constraints?: SessionConstraints;
};

// SSE
export type SessionSseEvent =
  | { type: "session.state"; session: SessionArtifacts }
  | { type: "session.error"; message: string };

// Live WS protocol
export type LiveClientMessage =
  | {
      type: "control.start";
      // For now we only support mono 16-bit PCM.
      mimeType: "audio/pcm;rate=16000";
    }
  | { type: "control.stop" }
  | {
      type: "audio.chunk";
      mimeType: "audio/pcm;rate=16000";
      dataBase64: string;
    }
  | {
      type: "transcript.user";
      chunk: TranscriptChunk;
    };

export type LiveServerMessage =
  | {
      type: "session.state";
      session: SessionArtifacts;
    }
  | {
      type: "transcript.chunk";
      chunk: TranscriptChunk;
    }
  | {
      type: "audio.chunk";
      mimeType: string;
      dataBase64: string;
    }
  | {
      type: "debug";
      message: string;
    }
  | {
      type: "error";
      message: string;
    };
