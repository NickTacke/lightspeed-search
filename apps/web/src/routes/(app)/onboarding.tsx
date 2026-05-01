import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "../../lib/auth-client.ts";

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
    cluster: "eu1" as "us1" | "eu1",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shops/onboard-manual", {
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
    <main style={{ maxWidth: 480, margin: "48px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Connect your Lightspeed shop</h1>
      <p>Either install via the Lightspeed app store, or paste an API key below.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label style={{ display: "block", marginBottom: 12 }}>
          Domain
          <input
            value={form.domain}
            onChange={(e) => setForm({ ...form, domain: e.target.value })}
            required
            placeholder="yourshop.shoplightspeed.com"
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          API key
          <input
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          API secret
          <input
            type="password"
            value={form.apiSecret}
            onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
            required
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Cluster
          <select
            value={form.cluster}
            onChange={(e) => setForm({ ...form, cluster: e.target.value as "us1" | "eu1" })}
            style={{ display: "block", padding: 8, marginTop: 4 }}
          >
            <option value="eu1">EU</option>
            <option value="us1">US</option>
          </select>
        </label>
        <button type="submit" disabled={mutation.isPending} style={{ padding: "8px 16px" }}>
          {mutation.isPending ? "Connecting..." : "Connect"}
        </button>
        {mutation.error && <p style={{ color: "crimson" }}>{(mutation.error as Error).message}</p>}
      </form>
    </main>
  );
}
