import * as Sentry from "@sentry/react";

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN_WEB as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_GIT_SHA as string | undefined) ?? undefined,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Report a render or loader error to Sentry. No-op when Sentry isn't initialized
 * (e.g. dev without VITE_SENTRY_DSN_WEB). Use inside TanStack Router
 * errorComponent fallbacks; the framework already has the error in hand.
 */
export function reportError(error: unknown): void {
  Sentry.captureException(error);
}
