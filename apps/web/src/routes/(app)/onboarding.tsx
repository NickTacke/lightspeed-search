import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "../../lib/api";
import { authClient } from "../../lib/auth-client";

export const Route = createFileRoute("/(app)/onboarding")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.session) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    domain: "",
    apiKey: "",
    apiSecret: "",
    cluster: "eu1" as "eu1" | "us1",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/shops/onboard-manual"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["shops"] });
      navigate({ to: "/dashboard" });
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connect your Lightspeed shop</CardTitle>
          <CardDescription>
            Install via the Lightspeed app store, or paste an API key below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                required
                placeholder="yourshop.shoplightspeed.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API key</Label>
              <Input
                id="apiKey"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API secret</Label>
              <Input
                id="apiSecret"
                type="password"
                value={form.apiSecret}
                onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cluster">Cluster</Label>
              <select
                id="cluster"
                value={form.cluster}
                onChange={(e) => setForm({ ...form, cluster: e.target.value as "eu1" | "us1" })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="eu1">EU</option>
                <option value="us1">US</option>
              </select>
            </div>
            <Button type="submit" disabled={mutation.isPending} className="w-full">
              {mutation.isPending ? "Connecting…" : "Connect"}
            </Button>
            {mutation.error && (
              <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
