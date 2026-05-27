import type { MiddlewareHandler } from "hono";
import type { AppLogger } from "../lib/logger.ts";

const HEADER = "x-request-id";

declare module "hono" {
  interface ContextVariableMap {
    requestId: string;
    logger: AppLogger;
  }
}

export function requestId(baseLogger: AppLogger): MiddlewareHandler {
  return async (c, next) => {
    const incoming = c.req.header(HEADER);
    const id = incoming ?? crypto.randomUUID();
    c.set("requestId", id);
    c.set("logger", baseLogger.child({ request_id: id }));
    c.header(HEADER, id);
    await next();
  };
}
