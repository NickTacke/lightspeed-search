import { loadEnv } from "./env.ts";
import { initSentry } from "./lib/sentry.ts";

const env = loadEnv();
initSentry(env);

import { buildApp } from "./app.ts";
import { createContainer } from "./container.ts";
import { startSyncCron } from "./cron.ts";

const container = createContainer(env);
const app = buildApp(container);

if (env.NODE_ENV !== "test") {
  startSyncCron(container);
}

container.logger.info({ port: env.API_PORT }, "api listening");

export default {
  port: env.API_PORT,
  fetch: app.fetch,
  idleTimeout: 120,
};
