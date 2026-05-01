import { buildApp } from "./app.ts";
import { createContainer } from "./container.ts";
import { loadEnv } from "./env.ts";

const env = loadEnv();
const container = createContainer(env);
const app = buildApp(container);

export default {
  port: env.API_PORT,
  fetch: app.fetch,
  idleTimeout: 120,
};

console.log(`API listening on http://localhost:${env.API_PORT}`);
