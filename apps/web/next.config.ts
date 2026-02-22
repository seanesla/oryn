import type { NextConfig } from "next";
import path from "node:path";

function resolveApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:8787";
  }
}

const apiOrigin = resolveApiOrigin();
const apiHost = new URL(apiOrigin).host;
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  transpilePackages: ["@oryn/shared"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              isProd
                ? "script-src 'self' 'unsafe-inline'"
                : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `connect-src 'self' ${apiOrigin} ws://${apiHost} wss://${apiHost}`,
              "img-src 'self' data:",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
