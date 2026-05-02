import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BellRing, RefreshCw, Search } from "lucide-react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/(app)/dashboard/")({ component: Dashboard });

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to aidey</h1>
        <p className="text-muted-foreground mt-2">
          Manage your storefront search, alerts, and sync.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardCard
          to="/dashboard/alerts"
          icon={<BellRing className="size-5 text-primary" />}
          title="Alerts"
          description="Banner messages on your storefront."
        />
        <DashboardCard
          to="/dashboard/search"
          icon={<Search className="size-5 text-primary" />}
          title="Search"
          description="Tune search behavior and widget appearance."
        />
        <DashboardCard
          to="/dashboard/sync"
          icon={<RefreshCw className="size-5 text-primary" />}
          title="Sync"
          description="See sync history and trigger manual syncs."
        />
      </div>
    </div>
  );
}

function DashboardCard({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">{icon}</div>
        <CardTitle className="mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link to={to}>
            Open <ArrowRight className="size-4 ml-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
