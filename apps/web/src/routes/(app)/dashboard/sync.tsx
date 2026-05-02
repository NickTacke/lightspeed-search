import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SyncLogDto {
  id: string;
  shopId: string;
  status: string;
  trigger: string;
  productsTotal: number;
  categoriesTotal: number;
  embeddingsGenerated: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

export const Route = createFileRoute("/(app)/dashboard/sync")({ component: SyncPage });

function SyncPage() {
  const queryClient = useQueryClient();
  const {
    data: logs,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sync-logs"],
    queryFn: async () => {
      const res = await fetch("/api/sync/logs", { credentials: "include" });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      return res.json() as Promise<SyncLogDto[]>;
    },
    refetchInterval: 5000,
  });

  const trigger = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sync/trigger", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sync-logs"] }),
  });

  const inProgress = logs?.some((l) => l.status === "syncing");

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sync</h1>
          <p className="text-muted-foreground mt-1">
            Pulls catalog data from Lightspeed every 15 minutes.
          </p>
        </div>
        <Button onClick={() => trigger.mutate()} disabled={trigger.isPending || inProgress}>
          {inProgress ? "Sync running…" : trigger.isPending ? "Queueing…" : "Sync now"}
        </Button>
      </header>

      {isLoading && <p className="text-muted-foreground">loading…</p>}
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {logs && logs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sync history yet. Connect a shop to start syncing.
          </CardContent>
        </Card>
      )}
      {logs && logs.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="text-right">Categories</TableHead>
                <TableHead className="text-right">Embeddings</TableHead>
                <TableHead className="text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{new Date(l.startedAt).toLocaleString()}</TableCell>
                  <TableCell>{l.trigger}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        l.status === "failure"
                          ? "destructive"
                          : l.status === "success"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {l.status}
                    </Badge>
                    {l.errorMessage && (
                      <div className="text-xs text-destructive mt-1">{l.errorMessage}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{l.productsTotal}</TableCell>
                  <TableCell className="text-right">{l.categoriesTotal}</TableCell>
                  <TableCell className="text-right">{l.embeddingsGenerated}</TableCell>
                  <TableCell className="text-right">
                    {l.completedAt
                      ? `${Math.round(
                          (new Date(l.completedAt).getTime() - new Date(l.startedAt).getTime()) /
                            1000,
                        )}s`
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
