import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { registerSessionRoutes } from "./sessions/routes";
import { registerLiveRoutes } from "./live/routes";
import { createMemorySessionStore } from "./core/memoryStore";
import { createSessionEventBus } from "./core/eventBus";
import { createFirestoreSessionStore } from "./core/firestoreStore";

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:standard" },
            }
          : undefined,
    },
  });

  await server.register(cors, {
    // Use onRequest so streaming responses (SSE) still get CORS headers.
    hook: "onRequest",
    origin: (origin, cb) => {
      // Allow non-browser clients (tests, curl)
      if (!origin) return cb(null, true);

      const allow = [
        process.env.CORS_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);

      if (allow.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked"), false);
    },
    credentials: true,
  });

  await server.register(websocket);

  server.get("/healthz", async () => ({ ok: true }));
  server.get("/health", async () => ({ ok: true }));

  const storeType = (process.env.SESSION_STORE ?? "memory").toLowerCase();
  const store = storeType === "firestore" ? createFirestoreSessionStore() : createMemorySessionStore();
  const bus = createSessionEventBus();

  await registerSessionRoutes(server, { store, bus });
  await registerLiveRoutes(server);

  return server;
}
