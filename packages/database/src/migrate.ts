#!/usr/bin/env bun
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const migrationsDir = new URL("../migrations", import.meta.url).pathname;
const sql = postgres(url, { max: 1 });

await sql`CREATE TABLE IF NOT EXISTS _migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const applied = new Set(
  (await sql<{ id: string }[]>`SELECT id FROM _migrations ORDER BY id`).map((r) => r.id),
);

const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`✓ ${file} (already applied)`);
    continue;
  }
  const content = await readFile(join(migrationsDir, file), "utf8");
  console.log(`→ Applying ${file}…`);
  await sql.unsafe(content);
  await sql`INSERT INTO _migrations (id) VALUES (${file})`;
  console.log(`✓ ${file}`);
}

await sql.end();
console.log("Migrations complete.");
