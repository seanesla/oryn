import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Modality, type LiveServerMessage as GenaiLiveServerMessage } from "@google/genai";

import type {
  LiveClientMessage,
  LiveServerMessage,
  SessionArtifacts,
  TranscriptChunk,
} from "@oryn/shared";

import { liveFunctionDeclarations, runLiveTool } from "./tooling";
import { createGenAiClient } from "../genai/client";
import { makeSystemInstruction } from "@oryn/agent";
import { rateLimitHook } from "../middleware/rate-limit";
import { requireSessionAuth } from "../middleware/auth";

const MAX_TRANSCRIPT_CHUNKS = 500;
const MAX_TRANSCRIPT_TEXT_CHARS = 10_000;

function safeJsonParse(input: string): unknown {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

const liveClientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("control.start"), mimeType: z.literal("audio/pcm;rate=16000") }),
  z.object({ type: z.literal("control.stop") }),
  z.object({
    type: z.literal("audio.chunk"),
    mimeType: z.literal("audio/pcm;rate=16000"),
    dataBase64: z.string().min(1).max(200_000),
  }),
  z.object({
    type: z.literal("transcript.user"),
    chunk: z.object({
      id: z.string(),
      speaker: z.literal("user"),
      text: z.string().min(1).max(MAX_TRANSCRIPT_TEXT_CHARS),
      timestampMs: z.number(),
      isPartial: z.boolean().optional(),
      turnId: z.string(),
    }),
  }),
]) satisfies z.ZodType<LiveClientMessage>;

function send(ws: { send: (data: string) => void }, msg: LiveServerMessage) {
  ws.send(JSON.stringify(msg));
}

function makeChunkId(prefix: string) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
}

function appendTranscript(prev: SessionArtifacts, chunk: TranscriptChunk): SessionArtifacts {
  const safeText = chunk.text.length > MAX_TRANSCRIPT_TEXT_CHARS
    ? chunk.text.slice(0, MAX_TRANSCRIPT_TEXT_CHARS)
    : chunk.text;
  const nextChunk = safeText === chunk.text ? chunk : { ...chunk, text: safeText };

  const existingFromEnd = [...prev.transcript].reverse().findIndex(
    (c) => c.turnId === nextChunk.turnId && c.speaker === nextChunk.speaker,
  );

  let nextTranscript: Array<TranscriptChunk>;
  if (existingFromEnd >= 0) {
    const idx = prev.transcript.length - 1 - existingFromEnd;
    nextTranscript = [...prev.transcript];
    nextTranscript[idx] = nextChunk;
  } else {
    nextTranscript = [...prev.transcript, nextChunk];
  }

  if (nextTranscript.length > MAX_TRANSCRIPT_CHUNKS) {
    nextTranscript = nextTranscript.slice(-MAX_TRANSCRIPT_CHUNKS);
  }

  return {
    ...prev,
    transcript: nextTranscript,
  };
}

export async function registerLiveRoutes(server: FastifyInstance, secret: string) {
  server.get(
    "/v1/sessions/:id/live",
    {
      websocket: true,
      onRequest: [
        requireSessionAuth(secret),
        rateLimitHook({
          windowMs: 60_000,
          maxRequests: 3,
          keyFn: (req) => `live-ws:${req.ip}`,
        }),
      ],
    },
    async (connection, req) => {
      const ws = (connection as any)?.socket ?? (connection as any);
      if (!ws || typeof ws.send !== "function") {
        server.log.error({ connectionType: typeof connection }, "websocket connection missing socket");
        return;
      }
      const sessionId = (req.params as any).id as string;

      const store = server.orynStore;
      const bus = server.orynBus;

      const initial = await store.get(sessionId);
      if (!initial) {
        send(ws, { type: "error", message: "Session not found" });
        ws.close();
        return;
      }

      let session: SessionArtifacts = initial;

      // Mark WS online.
      session = {
        ...session,
        wsState: "connected",
        latencyMs: session.latencyMs.current ? session.latencyMs : { current: 1, p50: 1 },
      };
      await store.put(session);
      bus.publish(sessionId, session);

      send(ws, { type: "session.state", session });

      const unsubscribe = bus.subscribe(sessionId, (next) => {
        session = next;
        send(ws, { type: "session.state", session: next });
      });

      let live: any = null;
      let agentTurnId: string | null = null;
      let userTurnId: string | null = null;

      async function ensureLive() {
        if (live) return live;

        let created: ReturnType<typeof createGenAiClient>;
        try {
          created = createGenAiClient();
        } catch (err: unknown) {
          server.log.error({ err }, "GenAI client init failed");
          const msg = "Voice backend unavailable";
          send(ws, { type: "error", message: msg });
          return null;
        }

        const { ai, mode } = created;

        const modelOverride = process.env.GEMINI_LIVE_MODEL;
        const model = modelOverride?.trim()
          ? modelOverride.trim()
          : mode === "vertex"
            ? "gemini-2.0-flash-live-preview-04-09"
            : "gemini-live-2.5-flash-preview";

        const voiceOverride = process.env.GEMINI_VOICE_NAME;
        const voiceName = voiceOverride?.trim() ? voiceOverride.trim() : "Aoede";

        const sys = makeSystemInstruction(session);

        try {
          live = await ai.live.connect({
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              speechConfig: {
                languageCode: "en-US",
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
              systemInstruction: sys,
              tools: [{ functionDeclarations: liveFunctionDeclarations }],
            },
            callbacks: {
              onopen: () => {
                send(ws, { type: "debug", message: "Gemini Live connected" });
              },
              onmessage: (message: GenaiLiveServerMessage) => {
              const content: any = message.serverContent;
              if (content?.interrupted) {
                send(ws, { type: "debug", message: "model interrupted" });
              }

              const inputTx: any = content?.inputTranscription;
              if (inputTx?.text) {
                userTurnId = userTurnId ?? makeChunkId("user_turn");
                const chunk: TranscriptChunk = {
                  id: makeChunkId("t"),
                  speaker: "user",
                  text: inputTx.text,
                  timestampMs: Date.now(),
                  isPartial: !Boolean(inputTx.finished),
                  turnId: userTurnId,
                };
                store.get(sessionId).then((s) => {
                  if (!s) return;
                  const next = appendTranscript(s, chunk);
                  store.put(next).then(() => bus.publish(sessionId, next));
                });
                send(ws, { type: "transcript.chunk", chunk });
                if (inputTx.finished) userTurnId = null;
              }

              const outputTx: any = content?.outputTranscription;
              if (outputTx?.text) {
                agentTurnId = agentTurnId ?? makeChunkId("agent_turn");
                const chunk: TranscriptChunk = {
                  id: makeChunkId("t"),
                  speaker: "agent",
                  text: outputTx.text,
                  timestampMs: Date.now(),
                  isPartial: !Boolean(outputTx.finished),
                  turnId: agentTurnId,
                };
                store.get(sessionId).then((s) => {
                  if (!s) return;
                  const next = appendTranscript(s, chunk);
                  store.put(next).then(() => bus.publish(sessionId, next));
                });
                send(ws, { type: "transcript.chunk", chunk });
                if (outputTx.finished) agentTurnId = null;
              }

              const parts: Array<any> = content?.modelTurn?.parts ?? [];
              for (const part of parts) {
                const inline = part?.inlineData;
                if (inline?.data && inline?.mimeType) {
                  send(ws, {
                    type: "audio.chunk",
                    mimeType: inline.mimeType,
                    dataBase64: inline.data,
                  });
                }
              }

              const calls = message.toolCall?.functionCalls ?? [];
              if (calls.length) {
                void (async () => {
                  for (const fc of calls) {
                    const toolName = fc.name;
                    if (!toolName) continue;
                    const toolId = fc.id;

                    send(ws, { type: "debug", message: `tool.start ${toolName}` });
                    try {
                      const response = await runLiveTool({
                        name: toolName,
                        args: (fc.args ?? undefined) as Record<string, unknown> | undefined,
                        sessionId,
                        store,
                        bus,
                        logger: server.log,
                      });
                      live.sendToolResponse({
                        functionResponses: {
                          id: toolId,
                          name: toolName,
                          response: response as Record<string, unknown>,
                        },
                      });
                      send(ws, { type: "debug", message: `tool.done ${toolName}` });
                    } catch (err: unknown) {
                      server.log.error({ err, toolName }, "tool execution failed");
                      const msg = "Tool execution failed";
                      live.sendToolResponse({
                        functionResponses: {
                          id: toolId,
                          name: toolName,
                          response: { error: msg },
                        },
                      });
                      send(ws, { type: "debug", message: `tool.error ${toolName}` });
                    }
                  }
                })();
              }
              },
              onerror: (e: any) => {
                server.log.error({ err: e }, "Gemini Live error");
                send(ws, { type: "error", message: "Voice backend error" });
              },
              onclose: (e: any) => {
                send(ws, { type: "debug", message: `Gemini Live closed (${e?.code ?? "?"})` });
              },
            },
          });
        } catch (err: unknown) {
          server.log.error({ err }, "Gemini Live connect failed");
          const msg = "Voice backend unavailable";
          send(ws, { type: "error", message: msg });
          return null;
        }

        return live;
      }

      ws.on("message", async (raw: unknown) => {
        const parsed = liveClientMessageSchema.safeParse(safeJsonParse(String(raw)));
        if (!parsed.success) {
          send(ws, { type: "error", message: "Invalid message" });
          return;
        }

        const msg = parsed.data;

        if (msg.type === "control.start") {
          await ensureLive();
          return;
        }

        if (msg.type === "control.stop") {
          if (live) {
            try {
              live.sendRealtimeInput({ audioStreamEnd: true });
            } catch {
              // ignore
            }
          }
          return;
        }

        if (msg.type === "transcript.user") {
          const s = await store.get(sessionId);
          if (!s) return;
          const next = appendTranscript(s, msg.chunk);
          await store.put(next);
          bus.publish(sessionId, next);
          send(ws, { type: "transcript.chunk", chunk: msg.chunk });
          return;
        }

        if (msg.type === "audio.chunk") {
          const s = await ensureLive();
          if (!s) return;
          s.sendRealtimeInput({
            media: {
              data: msg.dataBase64,
              mimeType: msg.mimeType,
            },
          });
        }
      });

      ws.on("close", () => {
        unsubscribe();

        if (live) {
          try {
            live.close();
          } catch {
            // ignore
          }
          live = null;
        }

        store.get(sessionId).then((s) => {
          if (!s) return;
          const next = { ...s, wsState: "offline" as const };
          store.put(next).then(() => bus.publish(sessionId, next));
        });
      });
    }
  );
}
