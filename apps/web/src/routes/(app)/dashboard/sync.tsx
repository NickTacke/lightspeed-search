import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/(app)/dashboard/sync")({
  component: SyncPage,
});

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
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 24, fontFamily: "system-ui" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1>Sync</h1>
        <button
          type="button"
          onClick={() => trigger.mutate()}
          disabled={trigger.isPending || inProgress}
          style={{ padding: "8px 16px" }}
        >
          {inProgress ? "Sync running…" : trigger.isPending ? "Queueing…" : "Sync now"}
        </button>
      </header>

      {isLoading && <p>loading…</p>}
      {error && <p style={{ color: "crimson" }}>{(error as Error).message}</p>}
      {logs && logs.length === 0 && <p>No sync history yet.</p>}
      {logs && logs.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Started</th>
              <th style={{ textAlign: "left", padding: 8 }}>Trigger</th>
              <th style={{ textAlign: "left", padding: 8 }}>Status</th>
              <th style={{ textAlign: "right", padding: 8 }}>Products</th>
              <th style={{ textAlign: "right", padding: 8 }}>Categories</th>
              <th style={{ textAlign: "right", padding: 8 }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: 8 }}>{new Date(l.startedAt).toLocaleString()}</td>
                <td style={{ padding: 8 }}>{l.trigger}</td>
                <td
                  style={{
                    padding: 8,
                    color:
                      l.status === "failure"
                        ? "crimson"
                        : l.status === "success"
                          ? "green"
                          : "#999",
                  }}
                >
                  {l.status}
                  {l.errorMessage && (
                    <div style={{ fontSize: 12, color: "crimson" }}>{l.errorMessage}</div>
                  )}
                </td>
                <td style={{ padding: 8, textAlign: "right" }}>{l.productsTotal}</td>
                <td style={{ padding: 8, textAlign: "right" }}>{l.categoriesTotal}</td>
                <td style={{ padding: 8, textAlign: "right" }}>
                  {l.completedAt
                    ? `${Math.round(
                        (new Date(l.completedAt).getTime() - new Date(l.startedAt).getTime()) /
                          1000,
                      )}s`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
