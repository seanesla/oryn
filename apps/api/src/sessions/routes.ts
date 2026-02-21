import type { FastifyInstance } from "fastify";
import { z } from "zod";

import type { CreateSessionRequest, SessionSseEvent } from "@oryn/shared";
import { makeEmptySession } from "./defaults";
import { createMemorySessionStore } from "../core/memoryStore";
import { createSessionEventBus } from "../core/eventBus";
import type { SessionEventBus, SessionStore } from "../core/types";
import { runSessionAnalysis } from "../pipeline/analyze";
import { rateLimitHook } from "../middleware/rate-limit";

export type ApiDeps = {
  store: SessionStore;
  bus: SessionEventBus;
};

const createSessionSchema = z.object({
  mode: z.union([z.literal("co-reading"), z.literal("claim-check")]),
  url: z.string().url().optional(),
  claimText: z.string().optional(),
  title: z.string().optional(),
  constraints: z
    .object({
      sourceConstraints: z.array(z.union([z.literal("prefer_primary"), z.literal("prefer_local")])),
      diversityTarget: z.union([z.literal("low"), z.literal("medium"), z.literal("high")]),
      maxCitations: z.union([z.literal(3), z.literal(5), z.literal(8)]),
      showLowConfidence: z.boolean(),
      noCommentaryMode: z.boolean(),
    })
    .optional(),
}) satisfies z.ZodType<CreateSessionRequest>;

export async function registerSessionRoutes(server: FastifyInstance, deps?: Partial<ApiDeps>) {
  const store = deps?.store ?? createMemorySessionStore();
  const bus = deps?.bus ?? createSessionEventBus();

  server.decorate("orynStore", store);
  server.decorate("orynBus", bus);

  server.post("/v1/sessions", async (req, reply) => {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const body = parsed.data;
    const sessionId = globalThis.crypto?.randomUUID?.() ?? `sess_${Date.now()}`;
    const createdAtMs = Date.now();

    const session = makeEmptySession({
      sessionId,
      createdAtMs,
      mode: body.mode,
      url: body.url,
      title: body.title ?? (body.mode === "claim-check" ? "Claim check" : undefined),
      constraints: body.constraints,
    });

    await store.create(session);
    bus.publish(sessionId, session);

    return reply.code(201).send(session);
  });

  server.put("/v1/sessions/:id/constraints", async (req, reply) => {
    const sessionId = (req.params as any).id as string;
    const session = await store.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const parsed = createSessionSchema.shape.constraints.safeParse(req.body);
    if (!parsed.success || !parsed.data) {
      return reply.code(400).send({ error: "Invalid constraints" });
    }

    const next = { ...session, constraints: parsed.data };
    await store.put(next);
    bus.publish(sessionId, next);
    return reply.send(next);
  });

  server.post("/v1/sessions/:id/transcript", async (req, reply) => {
    const sessionId = (req.params as any).id as string;
    const session = await store.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const chunkSchema = z.object({
      id: z.string().optional(),
      speaker: z.union([z.literal("user"), z.literal("agent")]),
      text: z.string(),
      timestampMs: z.number(),
      isPartial: z.boolean().optional(),
      turnId: z.string(),
    });
    const parsed = chunkSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid transcript chunk" });

    const chunk = {
      ...parsed.data,
      id: parsed.data.id ?? (globalThis.crypto?.randomUUID?.() ?? `t_${Date.now()}`),
    };
    const next = { ...session, transcript: [...session.transcript, chunk] };
    await store.put(next);
    bus.publish(sessionId, next);
    return reply.send(next);
  });

  server.post("/v1/sessions/:id/cards/:cardId/pin", async (req, reply) => {
    const sessionId = (req.params as any).id as string;
    const cardId = (req.params as any).cardId as string;
    const session = await store.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    const next = {
      ...session,
      evidenceCards: session.evidenceCards.map((c) =>
        c.id === cardId ? { ...c, pinned: !c.pinned } : c
      ),
    };
    await store.put(next);
    bus.publish(sessionId, next);
    return reply.send(next);
  });

  server.post("/v1/sessions/:id/choice-set/regenerate", async (req, reply) => {
    void req;
    const sessionId = (req.params as any).id as string;
    const session = await store.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    if (session.evidenceCards.length === 0) {
      return reply.code(400).send({ error: "No evidence cards yet. Run analysis first." });
    }

    const { optimizeChoiceSet } = await import("@oryn/tools");
    const choiceSet = optimizeChoiceSet(session.evidenceCards, [], session.constraints);
    const next = { ...session, choiceSet };
    await store.put(next);
    bus.publish(sessionId, next);
    return reply.send(next);
  });

  server.get("/v1/sessions", async (req, reply) => {
    const limit = Number((req.query as any)?.limit ?? 10);
    const list = await store.list(Number.isFinite(limit) ? Math.max(1, Math.min(50, limit)) : 10);
    return reply.send(list);
  });

  server.get("/v1/sessions/:id", async (req, reply) => {
    const sessionId = (req.params as any).id as string;
    const session = await store.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });
    return reply.send(session);
  });

  server.post(
    "/v1/sessions/:id/analyze",
    {
      onRequest: rateLimitHook({
        windowMs: 60_000,
        maxRequests: 5,
        keyFn: (req) => `analyze:${(req.params as any).id}`,
      }),
    },
    async (req, reply) => {
      const sessionId = (req.params as any).id as string;
      const session = await store.get(sessionId);
      if (!session) return reply.code(404).send({ error: "Session not found" });

      // Idempotency: avoid kicking off duplicate analyses.
      if (session.pipeline.evidenceBuilding || session.evidenceCards.length > 0) {
        return reply.code(202).send({ ok: true, started: false });
      }

      // Mark analysis as started immediately so clients don't double-trigger.
      const marked = {
        ...session,
        pipeline: { ...session.pipeline, evidenceBuilding: true },
      };
      await store.put(marked);
      bus.publish(sessionId, marked);

      // Fire-and-forget analysis.
      runSessionAnalysis({ sessionId, store, bus, logger: server.log }).catch((err) => {
        server.log.error({ err, sessionId }, "analysis failed");
      });

      return reply.code(202).send({ ok: true, started: true });
    },
  );

  server.get("/v1/sessions/:id/events", async (req, reply) => {
    const sessionId = (req.params as any).id as string;

    const session = await store.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Session not found" });

    // @fastify/cors sets headers late in the lifecycle by default.
    // For SSE we start streaming immediately, so we must set CORS headers
    // before writing anything.
    const origin = (req.headers.origin as string | undefined) ?? "";
    if (origin) {
      const allow = [
        process.env.CORS_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);

      if (allow.includes(origin)) {
        reply.raw.setHeader("Vary", "Origin");
        reply.raw.setHeader("Access-Control-Allow-Origin", origin);
        reply.raw.setHeader("Access-Control-Allow-Credentials", "true");
      }
    }

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");

    const write = (event: SessionSseEvent) => {
      reply.raw.write(`event: ${event.type}\n`);
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    write({ type: "session.state", session });

    const unsubscribe = bus.subscribe(sessionId, (next) => {
      write({ type: "session.state", session: next });
    });

    req.raw.on("close", () => {
      unsubscribe();
    });

    return reply;
  });
}

declare module "fastify" {
  interface FastifyInstance {
    orynStore: SessionStore;
    orynBus: SessionEventBus;
  }
}
