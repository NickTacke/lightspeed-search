import { createDatabase } from "@aidey/database";
import type { Env } from "./env.ts";

export function createContainer(env: Env) {
  const db = createDatabase(env.DATABASE_URL);
  return { db, env };
}

export type Container = ReturnType<typeof createContainer>;
