import { describe, expect, test } from "bun:test";
import { createEmailSender } from "../src/infrastructure/email-sender.ts";

describe("createEmailSender (dev mode)", () => {
  test("logs to console without calling Resend", async () => {
    const logs: string[] = [];
    const send = createEmailSender({
      apiKey: "",
      from: "Test <test@example.com>",
      devMode: true,
      logger: (msg) => logs.push(msg),
    });

    await send({ to: "user@example.com", subject: "hi", html: "<p>hello</p>" });

    expect(logs.some((l) => l.includes("user@example.com"))).toBe(true);
    expect(logs.some((l) => l.includes("hi"))).toBe(true);
  });
});
