import { buildApp } from "./app.ts";
import { createContainer } from "./container.ts";
import { loadEnv } from "./env.ts";

const env = loadEnv();
const container = createContainer(env);
const app = buildApp(container);

// Dev: write the OpenAPI spec to disk so hey-api can watch it via fs events
// (URL polling is noisy and can't tell when the doc actually changed).
if (process.env.NODE_ENV !== "production") {
  const res = await app.fetch(new Request("http://localhost/openapi.json"));
  const spec = await res.text();
  const target = new URL("../../../packages/api-client/openapi.json", import.meta.url);
  await Bun.write(target, spec);
}

export default {
  port: env.API_PORT,
  fetch: app.fetch,
  idleTimeout: 120,
};

console.log(`API listening on http://localhost:${env.API_PORT}`);
