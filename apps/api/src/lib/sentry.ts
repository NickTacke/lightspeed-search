import * as Sentry from "@sentry/bun";
import type { Env } from "../env.ts";

export function initSentry(env: Env): void {
  if (!env.SENTRY_DSN_API) return;
  Sentry.init({
    dsn: env.SENTRY_DSN_API,
    environment: env.NODE_ENV,
    tracesSampleRate: 0.0,
    beforeSend(event) {
      if (env.NODE_ENV === "test") return null;
      return event;
    },
  });
}

export function captureWithRequestId(err: unknown, requestId: string | undefined): void {
  Sentry.withScope((scope) => {
    if (requestId) scope.setTag("request_id", requestId);
    Sentry.captureException(err);
  });
}
