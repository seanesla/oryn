import crypto from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

export function resolveSessionAuthSecret(): string {
  const env = process.env.SESSION_AUTH_SECRET;
  if (env && env.length >= 16) return env;
  const generated = crypto.randomBytes(32).toString("base64url");
  console.warn("[auth] SESSION_AUTH_SECRET not set — auto-generated an ephemeral secret. Sessions will NOT survive restarts.");
  return generated;
}

export function generateSessionToken(sessionId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(sessionId).digest("base64url");
}

export function verifySessionToken(sessionId: string, token: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(sessionId).digest();
  const actual = Buffer.from(token, "base64url");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function requireSessionAuth(secret: string) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const sessionId = (req.params as any)?.id as string | undefined;
    if (!sessionId) {
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }

    // Try Authorization: Bearer <token> first, then ?access_token=<token>
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
    if (!token) {
      token = (req.query as any)?.access_token as string | undefined;
    }

    if (!token || !verifySessionToken(sessionId, token, secret)) {
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }
  };
}
