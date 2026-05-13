import { createFileRoute, Link, Outlet, redirect, useRouter } from "@tanstack/react-router";
import { BellRing, LayoutDashboard, LogOut, RefreshCw, Search } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { authClient } from "../../lib/auth-client";

export const Route = createFileRoute("/(app)")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.session) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AppLayout,
});

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
