import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../src/signature.ts";

describe("verifyWebhookSignature", () => {
  test("accepts a correct HMAC-SHA256 base64 signature", () => {
    const secret = "topsecret";
    const body = '{"hello":"world"}';
    const signature = createHmac("sha256", secret).update(body).digest("base64");
    expect(verifyWebhookSignature({ body, signature, secret })).toBe(true);
  });

  test("rejects a wrong signature", () => {
    expect(verifyWebhookSignature({ body: "x", signature: "bad", secret: "s" })).toBe(false);
  });

  test("rejects a signature of the right length but wrong bytes", () => {
    const goodLength = createHmac("sha256", "right").update("body").digest("base64");
    const wrongBytes = "A".repeat(goodLength.length);
    expect(verifyWebhookSignature({ body: "body", signature: wrongBytes, secret: "right" })).toBe(
      false,
    );
  });
});
