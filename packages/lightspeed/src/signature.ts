import { createHmac, timingSafeEqual } from "node:crypto";

export interface VerifyArgs {
  body: string;
  signature: string;
  secret: string;
}

export function verifyWebhookSignature({ body, signature, secret }: VerifyArgs): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("base64");
  if (expected.length !== signature.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
