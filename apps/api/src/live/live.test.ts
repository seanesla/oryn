import { afterAll, beforeAll, expect, test } from "vitest";

import { buildServer } from "../server";
import { startTestServer, stopTestServer } from "../__tests__/helpers";

let baseUrl = "";
let server: Awaited<ReturnType<typeof buildServer>>;

beforeAll(async () => {
  const started = await startTestServer(buildServer);
  baseUrl = started.baseUrl;
  server = started.server;
});

afterAll(async () => {
  await stopTestServer(server);
});

test("Live WS connects and reports missing backend key", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  const session = (await createRes.json()) as any;

  const wsUrl = baseUrl.replace(/^http/, "ws") + `/v1/sessions/${session.sessionId}/live`;
  const ws = new WebSocket(wsUrl);

  const messages: Array<any> = [];

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), 5_000);
    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "control.start", mimeType: "audio/pcm;rate=16000" }));
    });
    ws.addEventListener("message", (ev) => {
      try {
        messages.push(JSON.parse(String(ev.data)));
      } catch {
        messages.push(String(ev.data));
      }
      if (messages.some((m) => m?.type === "error")) {
        clearTimeout(t);
        resolve();
      }
    });
    ws.addEventListener("error", () => {
      clearTimeout(t);
      reject(new Error("ws error"));
    });
  });

  expect(messages.some((m) => m?.type === "session.state")).toBe(true);
  const err = messages.find((m) => m?.type === "error");
  expect(err?.message).toMatch(/Missing GEMINI_API_KEY|Live voice is disabled/);

  ws.close();
});
