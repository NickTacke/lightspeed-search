import { initSentry, SentryErrorBoundary } from "./lib/sentry.ts";

initSentry();

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/globals.css";
import { routeTree } from "./routeTree.gen.ts";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <StrictMode>
    <SentryErrorBoundary
      fallback={
        <div style={{ padding: 24 }}>Something went wrong. The error has been reported.</div>
      }
    >
      <RouterProvider router={router} />
    </SentryErrorBoundary>
  </StrictMode>,
);
