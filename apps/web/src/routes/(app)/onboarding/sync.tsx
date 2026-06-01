import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "../../../lib/api";

export const Route = createFileRoute("/(app)/onboarding/sync")({
  component: OnboardingSync,
});

interface SyncStatusDto {
  status: "idle" | "syncing" | "success" | "failure";
  productsTotal: number;
  productsCompleted: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
}

function OnboardingSync() {
  const navigate = useNavigate();
  const { data, error } = useQuery<SyncStatusDto>({
    queryKey: ["sync", "status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/sync/status"), { credentials: "include" });
      if (!res.ok) throw new Error("failed to load sync status");
      return res.json();
    },
    // Poll every second while the sync is in flight; stop once it terminates.
    // refetchInterval receives the latest query result.
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "success" || s === "failure" ? false : 1000;
    },
  });

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-destructive">
          {(error as Error).message}
        </CardContent>
      </Card>
    );
  }

  const status = data?.status ?? "idle";
  const completed = data?.productsCompleted ?? 0;
  const total = data?.productsTotal ?? 0;
  // While the very first batch is in flight, productsTotal is still 0 (no
  // product page returned yet) — show "Starting…" instead of a zeroed bar.
  const percent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === "success" ? (
            <CheckCircle2 className="size-5 text-emerald-600" />
          ) : status === "failure" ? (
            <AlertCircle className="size-5 text-destructive" />
          ) : (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
          {status === "success"
            ? "Catalog synced"
            : status === "failure"
              ? "Sync failed"
              : "Importing your catalog"}
        </CardTitle>
        <CardDescription>
          {status === "success"
            ? `Imported ${completed} products. You're ready to install the storefront snippet.`
            : status === "failure"
              ? "Something went wrong while syncing your catalog. You can retry from the dashboard."
              : "We're pulling your products and categories from Lightspeed. This usually takes a minute or two."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "syncing" || status === "idle" ? (
          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${total > 0 ? percent : 8}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {total > 0 ? `${completed} of ${total} products (${percent}%)` : "Starting…"}
            </p>
          </div>
        ) : null}
        {status === "failure" && data?.errorMessage ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            {data.errorMessage}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          {status === "success" ? (
            <Button onClick={() => navigate({ to: "/dashboard" })}>Go to dashboard</Button>
          ) : status === "failure" ? (
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
              Skip to dashboard
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
