process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5433/aidey";
process.env.BETTER_AUTH_SECRET ??= "test-secret-32-bytes-for-tests-only";
process.env.NODE_ENV ??= "test";

import { buildApp } from "../src/app.ts";
import { createContainer } from "../src/container.ts";
import { loadEnv } from "../src/env.ts";

export function buildTestApp() {
  const env = loadEnv();
  const container = createContainer(env);
  return buildApp(container);
}
