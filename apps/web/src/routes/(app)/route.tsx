import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { AlertTriangle, BellRing, LayoutDashboard, LogOut, RefreshCw, Search } from "lucide-react";
import type * as React from "react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "../../lib/auth-client";
import { reportError } from "../../lib/sentry";

export const Route = createFileRoute("/(app)")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.session) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AppLayout,
  // Scoped error boundary: when a dashboard leaf throws, the sidebar stays so
  // the user can navigate away without a hard reload. Sentry-reported.
  errorComponent: AppErrorComponent,
  notFoundComponent: () => (
    <div className="p-8">
      <Card title="Page not found" body="This dashboard page doesn't exist." />
    </div>
  ),
});

function AppErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);
  return (
    <div className="p-8 max-w-xl">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="size-5" />
          <h2 className="font-semibold">Something went wrong</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          This page hit an unexpected error. The team has been notified.
        </p>
        <pre className="text-xs bg-muted rounded p-3 overflow-auto max-h-40">{error.message}</pre>
        <div className="flex gap-2">
          <Button onClick={() => reset()}>Try again</Button>
          <Button variant="outline" asChild>
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 max-w-xl space-y-3">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}

function AppLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r bg-muted/20 flex flex-col">
        <div className="p-4">
          <Link to="/" className="font-bold text-lg tracking-tight">
            aidey
          </Link>
        </div>
        <Separator />
        <nav className="flex-1 p-2 space-y-1">
          <SidebarLink to="/dashboard" icon={<LayoutDashboard className="size-4" />}>
            Dashboard
          </SidebarLink>
          <SidebarLink to="/dashboard/alerts" icon={<BellRing className="size-4" />}>
            Alerts
          </SidebarLink>
          <SidebarLink to="/dashboard/sync" icon={<RefreshCw className="size-4" />}>
            Sync
          </SidebarLink>
          <SidebarLink to="/dashboard/search" icon={<Search className="size-4" />}>
            Search
          </SidebarLink>
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          <p className="text-xs text-muted-foreground truncate" title={user.email}>
            {user.email}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={async () => {
              await authClient.signOut();
              router.navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground [&.active]:bg-accent [&.active]:text-accent-foreground"
      activeProps={{ className: "active" }}
    >
      {icon}
      {children}
    </Link>
  );
}
