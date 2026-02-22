import crypto from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";

type ResolveSessionAuthSecretOptions = {
  require?: boolean;
};

const DEFAULT_SESSION_AUTH_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function resolveSessionAuthTtlMs(): number {
  const raw = process.env.SESSION_AUTH_TTL_MS;
  if (!raw) return DEFAULT_SESSION_AUTH_TTL_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SESSION_AUTH_TTL_MS;
  // Keep a sane upper bound to avoid accidental "forever" tokens.
  const max = 1000 * 60 * 60 * 24 * 365 * 5; // 5 years
  return Math.floor(Math.min(n, max));
}

export function resolveSessionAuthSecret(opts?: ResolveSessionAuthSecretOptions): string {
  const env = process.env.SESSION_AUTH_SECRET;
  if (env && env.length >= 16) return env;
  if (opts?.require) {
    throw new Error("SESSION_AUTH_SECRET must be set (>= 16 chars) to use a persistent session store");
  }
  const generated = crypto.randomBytes(32).toString("base64url");
  console.warn("[auth] SESSION_AUTH_SECRET not set — auto-generated an ephemeral secret. Sessions will NOT survive restarts.");
  return generated;
}

export function generateSessionToken(sessionId: string, secret: string): string {
  const expMs = Date.now() + resolveSessionAuthTtlMs();
  const expStr = String(expMs);
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${sessionId}.${expStr}`)
    .digest("base64url");
  return `${expStr}.${sig}`;
}

export function verifySessionToken(sessionId: string, token: string, secret: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sigB64] = parts;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp <= 0) return false;
  if (Date.now() > exp) return false;

  const expected = crypto.createHmac("sha256", secret).update(`${sessionId}.${expStr}`).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(sigB64, "base64url");
  } catch {
    return false;
  }
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
      token = authHeader.slice(7).trim();
    }
    if (!token) {
      const q = (req.query as any)?.access_token as unknown;
      token = typeof q === "string" ? q.trim() : undefined;
    }

    if (token && token.length > 2_000) {
      token = undefined;
    }

    if (!token || !verifySessionToken(sessionId, token, secret)) {
      reply.code(401).send({ error: "Unauthorized" });
      return reply;
    }
  };
}
