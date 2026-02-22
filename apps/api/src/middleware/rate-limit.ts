import type { FastifyRequest, FastifyReply } from "fastify";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyFn: (req: FastifyRequest) => string;
};

const counters = new Map<string, { count: number; resetAt: number }>();
let callsSincePrune = 0;

const MAX_COUNTER_KEYS = (() => {
  const raw = Number(process.env.ORYN_RATE_LIMIT_MAX_KEYS ?? 10_000);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 10_000;
})();

const EVICT_BATCH = Math.max(50, Math.floor(MAX_COUNTER_KEYS * 0.05));

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (now > entry.resetAt) counters.delete(key);
  }
}

function evictOldest(n: number) {
  for (let i = 0; i < n; i++) {
    const oldest = counters.keys().next().value as string | undefined;
    if (!oldest) return;
    counters.delete(oldest);
  }
}

function ensureCapacity() {
  if (counters.size <= MAX_COUNTER_KEYS) return;
  pruneExpired();
  if (counters.size <= MAX_COUNTER_KEYS) return;
  evictOldest(Math.min(EVICT_BATCH, counters.size - MAX_COUNTER_KEYS + 1));
}

export function rateLimitHook(config: RateLimitConfig) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    callsSincePrune++;
    if (callsSincePrune >= 100) {
      pruneExpired();
      callsSincePrune = 0;
    }

    const key = config.keyFn(req);
    const now = Date.now();
    let entry = counters.get(key);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + config.windowMs };
      counters.set(key, entry);
      ensureCapacity();
    } else {
      // LRU-ish: keep the most recently used keys at the end.
      counters.delete(key);
      counters.set(key, entry);
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      reply.code(429).send({ error: "Too many requests" });
      return reply;
    }
  };
}
