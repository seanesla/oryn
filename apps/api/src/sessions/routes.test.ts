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

function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}

test("create and get session with auth", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  expect(createRes.status).toBe(201);
  const { session: created, accessToken } = (await createRes.json()) as any;
  expect(created.sessionId).toBeTypeOf("string");
  expect(accessToken).toBeTypeOf("string");

  const getRes = await fetch(`${baseUrl}/v1/sessions/${created.sessionId}`, {
    headers: authHeader(accessToken),
  });
  expect(getRes.status).toBe(200);
  const got = (await getRes.json()) as any;
  expect(got.sessionId).toBe(created.sessionId);
});

test("requests without token return 401", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  const { session } = (await createRes.json()) as any;

  const getRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}`);
  expect(getRes.status).toBe(401);

  const badTokenRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}`, {
    headers: { Authorization: "Bearer invalid-token" },
  });
  expect(badTokenRes.status).toBe(401);
});

test("mutations: constraints, transcript, pin, regenerate", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  const { session, accessToken } = (await createRes.json()) as any;
  const auth = authHeader(accessToken);

  // Update constraints
  const constraintsRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/constraints`, {
    method: "PUT",
    headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify({
      sourceConstraints: ["prefer_primary"],
      diversityTarget: "high",
      maxCitations: 3,
      showLowConfidence: false,
      noCommentaryMode: true,
    }),
  });
  expect(constraintsRes.status).toBe(200);
  const afterConstraints = (await constraintsRes.json()) as any;
  expect(afterConstraints.constraints.diversityTarget).toBe("high");

  // Append transcript
  const txRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/transcript`, {
    method: "POST",
    headers: { "content-type": "application/json", ...auth },
    body: JSON.stringify({
      speaker: "user",
      text: "hello",
      timestampMs: Date.now(),
      isPartial: false,
      turnId: "turn_1",
    }),
  });
  expect(txRes.status).toBe(200);
  const afterTx = (await txRes.json()) as any;
  expect(afterTx.transcript.length).toBeGreaterThan(0);

  // Analyze to create evidence cards
  const analyzeRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/analyze`, {
    method: "POST",
    headers: auth,
  });
  expect(analyzeRes.status).toBe(202);
  const analyzeBody = (await analyzeRes.json()) as any;
  expect(analyzeBody.ok).toBe(true);
  expect(analyzeBody.started).toBe(true);

  // Calling analyze again should be a no-op.
  const analyzeRes2 = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/analyze`, {
    method: "POST",
    headers: auth,
  });
  expect(analyzeRes2.status).toBe(202);
  const analyzeBody2 = (await analyzeRes2.json()) as any;
  expect(analyzeBody2.ok).toBe(true);
  expect(analyzeBody2.started).toBe(false);

  // Poll for evidence cards
  let final: any = null;
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}`, { headers: auth });
    final = await r.json();
    if (final.pipeline?.evidenceBuilding === false && (final.evidenceCards?.length ?? 0) > 0) break;
    await new Promise((r2) => setTimeout(r2, 100));
  }
  expect(final.evidenceCards.length).toBeGreaterThan(0);
  expect(final.choiceSet.length).toBe(3);

  // Pin toggle first card
  const cardId = final.evidenceCards[0].id;
  const pinRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/cards/${cardId}/pin`, {
    method: "POST",
    headers: auth,
  });
  expect(pinRes.status).toBe(200);
  const afterPin = (await pinRes.json()) as any;
  const pinned = afterPin.evidenceCards.find((c: any) => c.id === cardId)?.pinned;
  expect(typeof pinned).toBe("boolean");

  // Regenerate choice set
  const regenRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/choice-set/regenerate`, {
    method: "POST",
    headers: auth,
  });
  expect(regenRes.status).toBe(200);
  const afterRegen = (await regenRes.json()) as any;
  expect(afterRegen.choiceSet.length).toBe(3);
  for (const item of afterRegen.choiceSet) {
    expect(item.url).toBeTypeOf("string");
    expect(item.title).toBeTypeOf("string");
    expect(item.frameLabel).toBeTypeOf("string");
    expect(item.reason).toBeTypeOf("string");
  }
});
