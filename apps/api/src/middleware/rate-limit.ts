import type { FastifyRequest, FastifyReply } from "fastify";

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  keyFn: (req: FastifyRequest) => string;
};

const counters = new Map<string, { count: number; resetAt: number }>();

export function rateLimitHook(config: RateLimitConfig) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const key = config.keyFn(req);
    const now = Date.now();
    let entry = counters.get(key);

    if (!entry || now > entry.resetAt) {
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
