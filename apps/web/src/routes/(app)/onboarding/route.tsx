import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { authClient } from "../../../lib/auth-client";

export const Route = createFileRoute("/(app)/onboarding")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.session) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: OnboardingLayout,
});

export type StepKey = "connect" | "plan" | "sync" | "install" | "done";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "connect", label: "Connect shop" },
  { key: "plan", label: "Pick plan" },
  { key: "sync", label: "Initial sync" },
  { key: "install", label: "Install snippet" },
  { key: "done", label: "Go live" },
];

function OnboardingLayout() {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your shop</h1>
          <p className="text-sm text-muted-foreground">A few quick steps and you're live.</p>
        </header>
        <Stepper />
        <Outlet />
      </div>
    </div>
  );
}

// Maps the current path's last segment to a step. The index route is the
// "connect" step; nested routes (sync, install, done) match their key.
function pathToStepIndex(pathname: string): number {
  const segment = pathname.replace(/\/$/, "").split("/").pop();
  const idx = STEPS.findIndex((s) => s.key === segment);
  return idx === -1 ? 0 : idx;
}

function Stepper() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentIndex = pathToStepIndex(pathname);
  return (
    <ol className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
      {STEPS.map((step, i) => {
        const status = i < currentIndex ? "done" : i === currentIndex ? "current" : "todo";
        return (
          <li
            key={step.key}
            className={`flex items-center gap-2 ${
              status === "current"
                ? "text-foreground font-medium"
                : status === "done"
                  ? "text-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {status === "done" ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <Circle
                className={`size-4 ${status === "current" ? "text-foreground" : "text-muted-foreground/60"}`}
              />
            )}
            <span>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
