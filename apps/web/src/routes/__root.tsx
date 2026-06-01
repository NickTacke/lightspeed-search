import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { ErrorPage } from "../components/error-page";
import "../lib/api.ts";
import { reportError } from "../lib/sentry.ts";
import "../styles/globals.css";

const queryClient = new QueryClient();

export const Route = createRootRoute({
  component: () => (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  ),
  errorComponent: RootErrorComponent,
  notFoundComponent: () => (
    <ErrorPage
      status="404"
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
    />
  ),
});

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  // Send to Sentry once per error instance — effect deps catch identity churn.
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <ErrorPage
      status="500"
      title="Something went wrong"
      description="An unexpected error broke this page. We've been notified."
      detail={error.message}
      onRetry={reset}
    />
  );
}
