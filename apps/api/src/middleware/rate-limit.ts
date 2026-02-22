import type { FastifyRequest, FastifyReply } from "fastify";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyFn: (req: FastifyRequest) => string;
};

const counters = new Map<string, { count: number; resetAt: number }>();
let callsSincePrune = 0;

function pruneExpired() {
  const now = Date.now();
  for (const [key, entry] of counters) {
    if (now > entry.resetAt) counters.delete(key);
  }
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
      if (counters.size >= 10_000) {
        reply.code(429).send({ error: "Too many requests" });
        return reply;
      }
      entry = { count: 0, resetAt: now + config.windowMs };
      counters.set(key, entry);
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      reply.code(429).send({ error: "Too many requests" });
      return reply;
    }
  };
}
