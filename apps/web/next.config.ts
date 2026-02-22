import type { NextConfig } from "next";
import path from "node:path";

const apiOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8787").replace(/\/$/, "");
const apiHost = (() => { try { return new URL(apiOrigin).host; } catch { return "localhost:8787"; } })();

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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `connect-src 'self' ${apiOrigin} wss://${apiHost}`,
              "img-src 'self' data:",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
