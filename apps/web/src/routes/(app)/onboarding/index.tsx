import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API_URL, apiUrl } from "../../../lib/api";

export const Route = createFileRoute("/(app)/onboarding/")({
  component: OnboardingIndex,
});

interface ShopDto {
  id: string;
  domain: string;
  name: string;
  cluster: string;
}

function OnboardingIndex() {
  const { data: shops, isLoading } = useQuery<ShopDto[]>({
    queryKey: ["shops"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/shops"), { credentials: "include" });
      if (!res.ok) throw new Error("failed to load shops");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  const firstShop = shops?.[0];
  return firstShop ? <ShopConnected shop={firstShop} /> : <ConnectStep />;
}

function ConnectStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect your Lightspeed shop</CardTitle>
        <CardDescription>We use OAuth so you don't need to copy any keys around.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <a
          href={
            API_URL
              ? `${API_URL}/api/oauth/lightspeed/start?source=direct`
              : "/api/oauth/lightspeed/start?source=direct"
          }
        >
          <Button className="w-full" size="lg">
            Connect Lightspeed
          </Button>
        </a>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>
        <ManualKeyForm />
      </CardContent>
    </Card>
  );
}

function ManualKeyForm() {
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
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">
        Use API key instead (legacy)
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-3 pt-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            required
            placeholder="yourshop.shoplightspeed.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apiKey">API key</Label>
          <Input
            id="apiKey"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="apiSecret">API secret</Label>
          <Input
            id="apiSecret"
            type="password"
            value={form.apiSecret}
            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1.5">
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
        <Button type="submit" disabled={mutation.isPending} className="w-full" variant="outline">
          {mutation.isPending ? "Connecting…" : "Connect with API key"}
        </Button>
        {mutation.error && (
          <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
        )}
      </form>
    </details>
  );
}

function ShopConnected({ shop }: { shop: ShopDto }) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop connected</CardTitle>
        <CardDescription>You're connected to {shop.name}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Next we'll import your catalog so search and alerts have data to work with.
        </p>
        <Button onClick={() => navigate({ to: "/onboarding/sync" })}>Continue</Button>
      </CardContent>
    </Card>
  );
}
