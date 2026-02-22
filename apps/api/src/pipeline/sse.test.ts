import { afterAll, beforeAll, expect, test } from "vitest";

import { buildServer } from "../server";
import { readSseEvents, startTestServer, stopTestServer } from "../__tests__/helpers";

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

test("SSE emits session updates during analysis", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  const { session, accessToken } = (await createRes.json()) as any;

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 7_000);
  const sseRes = await fetch(
    `${baseUrl}/v1/sessions/${session.sessionId}/events?access_token=${encodeURIComponent(accessToken)}`,
    { signal: controller.signal },
  );
  expect(sseRes.status).toBe(200);

  // Kick off analysis after SSE is connected.
  const analyzeRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/analyze`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  expect(analyzeRes.status).toBe(202);

  const events = await readSseEvents({ res: sseRes, maxEvents: 20, timeoutMs: 6_000 });
  clearTimeout(abortTimer);
  controller.abort();
  expect(events.length).toBeGreaterThan(0);

  const states = events
    .map((e) => e.data)
    .filter((d) => d?.type === "session.state")
    .map((d) => d.session);

  expect(states.length).toBeGreaterThan(0);

  const anyBuilding = states.some((s: any) => s.pipeline?.evidenceBuilding === true);
  expect(anyBuilding).toBe(true);

  const done = [...states]
    .reverse()
    .find((s: any) => s.pipeline?.evidenceBuilding === false && (s.evidenceCards?.length ?? 0) > 0);
  expect(done).toBeTruthy();
  expect(done.evidenceCards.length).toBeGreaterThan(0);
  expect(done.choiceSet.length).toBe(3);
});
