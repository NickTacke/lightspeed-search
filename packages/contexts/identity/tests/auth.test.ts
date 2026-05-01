import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { createDatabase, type Database } from "@aidey/database";
import { eq } from "drizzle-orm";
import { codeFromToken, tokenFromCode } from "../src/infrastructure/auth.ts";
import * as schema from "../src/infrastructure/schema.ts";

const url = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5433/aidey";
let db: Database;

beforeAll(() => {
  db = createDatabase(url);
});

afterEach(async () => {
  // Clean up the rows inserted by the tests below (identifier = the token itself,
  // matching how Better Auth's magic-link plugin actually stores rows).
  for (const id of ["SfNNVXKBtKBZzZmIPUhalutAASLIwLgE", "expired-token-abcdef"]) {
    await db.delete(schema.verification).where(eq(schema.verification.identifier, id));
  }
});

afterAll(async () => {
  // postgres-js connections close on process exit; nothing to do
});

describe("codeFromToken", () => {
  test("returns a 6-digit numeric string", () => {
    expect(codeFromToken("anything-goes-here")).toMatch(/^\d{6}$/);
    expect(codeFromToken("SfNNVXKBtKBZzZmIPUhalutAASLIwLgE")).toMatch(/^\d{6}$/);
    expect(codeFromToken("")).toMatch(/^\d{6}$/);
  });

  test("is deterministic — same token always yields same code", () => {
    const token = "SfNNVXKBtKBZzZmIPUhalutAASLIwLgE";
    expect(codeFromToken(token)).toBe(codeFromToken(token));
  });

  test("different tokens generally yield different codes", () => {
    // Not a guarantee (collision space is 1M), but two arbitrary tokens shouldn't collide here
    expect(codeFromToken("token-a")).not.toBe(codeFromToken("token-b"));
  });
});

describe("tokenFromCode (DB)", () => {
  test("returns the active token whose derived code matches", async () => {
    const token = "SfNNVXKBtKBZzZmIPUhalutAASLIwLgE";
    const expectedCode = codeFromToken(token);
    await db.insert(schema.verification).values({
      id: "tk-1",
      identifier: token,
      value: JSON.stringify({ email: "user@example.com", attempt: 0 }),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    const result = await tokenFromCode(db, expectedCode);
    expect(result).toBe(token);
  });

  test("returns null for expired tokens", async () => {
    const token = "expired-token-abcdef";
    const code = codeFromToken(token);
    await db.insert(schema.verification).values({
      id: "tk-2",
      identifier: token,
      value: JSON.stringify({ email: "user@example.com", attempt: 0 }),
      expiresAt: new Date(Date.now() - 1000),
    });
    const result = await tokenFromCode(db, code);
    expect(result).toBeNull();
  });

  test("returns null for unknown code", async () => {
    const result = await tokenFromCode(db, "999999");
    expect(result).toBeNull();
  });
});
