import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

interface AlertDto {
  id: string;
  shopId: string;
  title: string;
  message: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Route = createFileRoute("/(app)/dashboard/alerts")({ component: Alerts });

function Alerts() {
  const queryClient = useQueryClient();
  const {
    data: alerts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/alerts"), { credentials: "include" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `failed: ${res.status}`);
      }
      return res.json() as Promise<AlertDto[]>;
    },
  });

  const create = useMutation({
    mutationFn: async (input: { title: string; message: string; enabled: boolean }) => {
      const res = await fetch(apiUrl("/api/alerts"), {
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
      const res = await fetch(apiUrl(`/api/alerts/${id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const res = await fetch(apiUrl(`/api/alerts/${id}`), {
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
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
        <p className="text-muted-foreground mt-1">Banner messages displayed on your storefront.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New alert</CardTitle>
          <CardDescription>Visible to all visitors until disabled or deleted.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ title, message, enabled: true });
              setTitle("");
              setMessage("");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create alert"}
            </Button>
            {create.error && (
              <p className="text-sm text-destructive">{(create.error as Error).message}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-xl font-semibold mb-3">Existing alerts</h2>
        {isLoading && <p className="text-muted-foreground">loading…</p>}
        {error && <p className="text-destructive">{(error as Error).message}</p>}
        {alerts && alerts.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No alerts yet. Create your first one above.
            </CardContent>
          </Card>
        )}
        {alerts && alerts.length > 0 && (
          <div className="space-y-3">
            {alerts.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <strong>{a.title}</strong>
                      {!a.enabled && <Badge variant="secondary">Disabled</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={a.enabled}
                      onCheckedChange={(checked) => toggle.mutate({ id: a.id, enabled: checked })}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove.mutate(a.id)}
                      title="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
