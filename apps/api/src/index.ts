import "./loadEnv";

import { buildServer } from "./server";

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

const server = await buildServer();

try {
  await server.listen({ port, host });
  server.log.info({ port, host }, "api listening");
} catch (err) {
  server.log.error(err, "api failed to start");
  process.exit(1);
}
