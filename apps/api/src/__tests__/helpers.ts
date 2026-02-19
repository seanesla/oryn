import type { FastifyInstance } from "fastify";

export async function startTestServer(build: () => Promise<FastifyInstance>) {
  const server = await build();
  await server.listen({ port: 0, host: "127.0.0.1" });

  const addr = server.server.address();
  if (!addr || typeof addr === "string") {
    throw new Error("Unexpected address");
  }

  const baseUrl = `http://127.0.0.1:${addr.port}`;
  return { server, baseUrl };
}

export async function stopTestServer(server: FastifyInstance) {
  await server.close();
}

export async function readSseEvents(input: {
  res: Response;
  maxEvents: number;
  timeoutMs?: number;
}) {
  const { res, maxEvents, timeoutMs = 10_000 } = input;
  if (!res.body) throw new Error("Missing body");

  const decoder = new TextDecoder();
  const reader = res.body.getReader();

  const events: Array<{ event?: string; data?: any }> = [];
  let buffer = "";
  const start = Date.now();

  while (events.length < maxEvents) {
    if (Date.now() - start > timeoutMs) break;
    let readResult: Awaited<ReturnType<typeof reader.read>>;
    try {
      readResult = await reader.read();
    } catch {
      break;
    }

    const { value, done } = readResult;
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      let ev: string | undefined;
      let dataLine = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) ev = line.slice("event:".length).trim();
        if (line.startsWith("data:")) dataLine += line.slice("data:".length).trim();
      }

      let data: any = undefined;
      if (dataLine) {
        try {
          data = JSON.parse(dataLine);
        } catch {
          data = dataLine;
        }
      }

      events.push({ event: ev, data });
      if (events.length >= maxEvents) break;
    }
  }

  try {
    await reader.cancel();
  } catch {
    // ignore
  }

  return events;
}

export async function fetchSseEvents(input: {
  url: string;
  maxEvents: number;
  timeoutMs?: number;
}) {
  const { url, maxEvents, timeoutMs = 8_000 } = input;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`SSE status ${res.status}`);
    return await readSseEvents({ res, maxEvents, timeoutMs });
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function waitForSseSession(input: {
  url: string;
  predicate: (session: any) => boolean;
  timeoutMs?: number;
}) {
  const { url, predicate, timeoutMs = 10_000 } = input;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`SSE status ${res.status}`);
    if (!res.body) throw new Error("Missing body");

    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    let buffer = "";

    while (true) {
      let readResult: Awaited<ReturnType<typeof reader.read>>;
      try {
        readResult = await reader.read();
      } catch {
        break;
      }

      const { value, done } = readResult;
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);

        let dataLine = "";
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data:")) dataLine += line.slice("data:".length).trim();
        }
        if (!dataLine) continue;

        let payload: any;
        try {
          payload = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (payload?.type === "session.state" && payload.session) {
          if (predicate(payload.session)) {
            controller.abort();
            return payload.session;
          }
        }
      }
    }

    throw new Error("SSE ended before predicate matched");
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
