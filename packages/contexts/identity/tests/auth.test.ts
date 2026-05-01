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
  await db.delete(schema.verification).where(eq(schema.verification.identifier, "magic-link"));
});

afterAll(async () => {
  // postgres-js connections close on process exit; nothing to do
});

describe("codeFromToken (pure)", () => {
  test("derives last-6-hex → mod 1e6 → zero-padded", () => {
    expect(codeFromToken("abcdef0123456789abcdef000000")).toBe("000000");
    expect(codeFromToken("deadbeefcafe000001")).toBe(
      (0x000001 % 1_000_000).toString().padStart(6, "0"),
    );
    expect(codeFromToken("ffffffffffffff")).toBe(
      (0xffffff % 1_000_000).toString().padStart(6, "0"),
    );
  });
});

describe("tokenFromCode (DB)", () => {
  test("returns the active token whose derived code matches", async () => {
    const token = "abcdef0123456789abcdef000000";
    await db.insert(schema.verification).values({
      id: "tk-1",
      identifier: "magic-link",
      value: token,
      expiresAt: new Date(Date.now() + 10 * 60_000),
    });

    const result = await tokenFromCode(db, "000000");
    expect(result).toBe(token);
  });

  test("returns null for expired tokens", async () => {
    await db.insert(schema.verification).values({
      id: "tk-2",
      identifier: "magic-link",
      value: "deadbeefcafe000001",
      expiresAt: new Date(Date.now() - 1000),
    });
    const code = (0x000001 % 1_000_000).toString().padStart(6, "0");
    const result = await tokenFromCode(db, code);
    expect(result).toBeNull();
  });

  test("returns null for unknown code", async () => {
    const result = await tokenFromCode(db, "999999");
    expect(result).toBeNull();
  });
});
