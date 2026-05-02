import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

interface AlertDto {
  id: string;
  shopId: string;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Route = createFileRoute("/(app)/dashboard/alerts")({
  component: Alerts,
});

function Alerts() {
  const queryClient = useQueryClient();
  const {
    data: alerts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts", { credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `failed: ${res.status}`);
      }
      return res.json() as Promise<AlertDto[]>;
    },
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; message: string; enabled: boolean }) => {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("create failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error("toggle failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Alerts</h1>

      <section style={{ marginBottom: 32, padding: 16, border: "1px solid #ddd", borderRadius: 4 }}>
        <h2>New alert</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate({ title, message, enabled: true });
            setTitle("");
            setMessage("");
          }}
        >
          <label style={{ display: "block", marginBottom: 8 }}>
            Title
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 8 }}>
            Message
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
            />
          </label>
          <button type="submit" disabled={create.isPending} style={{ padding: "8px 16px" }}>
            {create.isPending ? "Creating…" : "Create alert"}
          </button>
          {create.error && <p style={{ color: "crimson" }}>{(create.error as Error).message}</p>}
        </form>
      </section>

      <section>
        <h2>Existing alerts</h2>
        {isLoading && <p>loading…</p>}
        {error && <p style={{ color: "crimson" }}>{(error as Error).message}</p>}
        {alerts && alerts.length === 0 && <p>No alerts yet.</p>}
        {alerts && alerts.length > 0 && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {alerts.map((a) => (
              <li key={a.id} style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong>{a.title}</strong>
                    {!a.enabled && <span style={{ marginLeft: 8, color: "#999" }}>(disabled)</span>}
                    <p style={{ margin: "4px 0", color: "#555" }}>{a.message}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => toggle.mutate({ id: a.id, enabled: !a.enabled })}
                      style={{ padding: "4px 12px" }}
                    >
                      {a.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove.mutate(a.id)}
                      style={{ padding: "4px 12px", color: "crimson" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
