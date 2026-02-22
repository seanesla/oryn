import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";

import { registerSessionRoutes } from "./sessions/routes";
import { registerLiveRoutes } from "./live/routes";
import { createMemorySessionStore } from "./core/memoryStore";
import { createSessionEventBus } from "./core/eventBus";
import { createFirestoreSessionStore } from "./core/firestoreStore";
import { resolveSessionAuthSecret } from "./middleware/auth";

function redactAccessTokenFromUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl, "http://localhost");
    u.searchParams.delete("access_token");
    return `${u.pathname}${u.search}`;
  } catch {
    return rawUrl.replace(/([?&])access_token=[^&]+/g, "$1access_token=[REDACTED]");
  }
}

export async function buildServer() {
  const trustProxyHops = Number(process.env.ORYN_TRUST_PROXY_HOPS ?? 1);
  const trustProxy = Number.isFinite(trustProxyHops) && trustProxyHops > 0 ? Math.floor(trustProxyHops) : false;

  const server = Fastify({
    trustProxy,
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      serializers: {
        req(req) {
          return {
            method: req.method,
            url: redactAccessTokenFromUrl(req.url),
            hostname: req.hostname,
            ip: req.ip,
            remoteAddress: req.socket?.remoteAddress,
            remotePort: req.socket?.remotePort,
          };
        },
      },
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
        ...(process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()) ?? []),
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
  const secret = resolveSessionAuthSecret({ require: storeType === "firestore" });

  await registerSessionRoutes(server, { store, bus, secret });
  await registerLiveRoutes(server, secret);

  return server;
}
