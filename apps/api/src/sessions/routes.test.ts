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

test("create/get/list session", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  expect(createRes.status).toBe(201);
  const created = (await createRes.json()) as any;
  expect(created.sessionId).toBeTypeOf("string");

  const getRes = await fetch(`${baseUrl}/v1/sessions/${created.sessionId}`);
  expect(getRes.status).toBe(200);
  const got = (await getRes.json()) as any;
  expect(got.sessionId).toBe(created.sessionId);

  const listRes = await fetch(`${baseUrl}/v1/sessions?limit=10`);
  expect(listRes.status).toBe(200);
  const list = (await listRes.json()) as Array<any>;
  expect(list.some((x) => x.sessionId === created.sessionId)).toBe(true);
});

test("mutations: constraints, transcript, pin, regenerate", async () => {
  const createRes = await fetch(`${baseUrl}/v1/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "co-reading", url: "https://example.com/article" }),
  });
  const session = (await createRes.json()) as any;

  // Update constraints
  const constraintsRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/constraints`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
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
  });
  expect(analyzeRes.status).toBe(202);

  // Poll for evidence cards
  let final: any = null;
  for (let i = 0; i < 30; i++) {
    const r = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}`);
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
  });
  expect(pinRes.status).toBe(200);
  const afterPin = (await pinRes.json()) as any;
  const pinned = afterPin.evidenceCards.find((c: any) => c.id === cardId)?.pinned;
  expect(typeof pinned).toBe("boolean");

  // Regenerate choice set
  const regenRes = await fetch(`${baseUrl}/v1/sessions/${session.sessionId}/choice-set/regenerate`, {
    method: "POST",
  });
  expect(regenRes.status).toBe(200);
  const afterRegen = (await regenRes.json()) as any;
  expect(afterRegen.choiceSet.length).toBe(3);
  expect(afterRegen.choiceSet[0].reason).toMatch(/regen:/);
});
