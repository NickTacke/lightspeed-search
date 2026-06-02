import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl } from "../../../lib/api";

export const Route = createFileRoute("/(app)/onboarding/install")({
  component: OnboardingInstall,
});

interface ShopDto {
  id: string;
  domain: string;
  name: string;
  cluster: string;
}

interface InstallCheckDto {
  installed: boolean;
  reason?:
    | "loader_url_not_configured"
    | "no_storefront_domain"
    | "storefront_unreachable"
    | "fetch_error";
  storefrontUrl?: string;
  httpStatus?: number;
}

const LOADER_URL = import.meta.env.VITE_WIDGET_LOADER_URL as string | undefined;

function OnboardingInstall() {
  const navigate = useNavigate();
  const { data: shops, isLoading } = useQuery<ShopDto[]>({
    queryKey: ["shops"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/shops"), { credentials: "include" });
      if (!res.ok) throw new Error("failed to load shops");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading…
        </CardContent>
      </Card>
    );
  }

  const shop = shops?.[0];
  if (!shop) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No shop connected. Go back to the connect step.
        </CardContent>
      </Card>
    );
  }

  if (!LOADER_URL) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Widget loader URL not configured</CardTitle>
          <CardDescription>
            Set <code className="text-xs">VITE_WIDGET_LOADER_URL</code> in your environment (e.g.{" "}
            <code className="text-xs">https://cdn.aidey.app/loader/widget.js</code>) and rebuild.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => navigate({ to: "/dashboard" })}>
            Skip to dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <InstallStep shop={shop} loaderUrl={LOADER_URL} />;
}

function InstallStep({ shop, loaderUrl }: { shop: ShopDto; loaderUrl: string }) {
  const navigate = useNavigate();
  const snippet = `<script src="${loaderUrl}" defer></script>`;
  const storefrontUrl = `https://${shop.domain}`;
  const [copied, setCopied] = useState(false);

  // Poll the api every 3s. The api fetches the storefront HTML and looks for
  // the loader URL in it. Stops once installed=true (success terminates).
  const { data: check } = useQuery<InstallCheckDto>({
    queryKey: ["install-check"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/onboarding/install-check"), { credentials: "include" });
      if (!res.ok) throw new Error("install-check failed");
      return res.json();
    },
    refetchInterval: (q) => (q.state.data?.installed ? false : 3_000),
  });

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install the storefront snippet</CardTitle>
        <CardDescription>
          Paste this script tag into your Lightspeed theme just before
          <code className="mx-1 text-xs">{"</body>"}</code>. We'll detect when it loads on{" "}
          {shop.domain}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative">
          <pre className="overflow-x-auto rounded-md border bg-muted px-3 py-3 pr-12 text-xs font-mono">
            {snippet}
          </pre>
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1"
            onClick={copy}
            aria-label="Copy snippet"
          >
            <Copy className="size-4" />
            <span className="ml-1 text-xs">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>

        <div className="rounded-md border bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">After you've pasted the snippet</p>
            <p className="text-xs text-muted-foreground">
              Visit your storefront once so we can verify it's loading.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href={storefrontUrl} target="_blank" rel="noreferrer">
              Open storefront
              <ExternalLink className="ml-1 size-3" />
            </a>
          </Button>
        </div>

        <StatusBlock check={check} />

        <div className="flex justify-end gap-2">
          <Button
            onClick={() => navigate({ to: "/dashboard" })}
            disabled={!check?.installed}
            variant={check?.installed ? "default" : "outline"}
          >
            {check?.installed ? "Continue" : "Skip for now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBlock({ check }: { check: InstallCheckDto | undefined }) {
  if (!check) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Waiting…
      </p>
    );
  }
  if (check.installed) {
    return (
      <p className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="size-4" />
        Verified — the loader is live on your storefront.
      </p>
    );
  }
  const reason = check.reason;
  if (reason === "no_storefront_domain") {
    return (
      <p className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="size-4" />
        We don't have a storefront URL for this shop yet. You can install the snippet and skip for
        now; we'll detect it on the first widget call.
      </p>
    );
  }
  if (reason === "storefront_unreachable") {
    return (
      <p className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="size-4" />
        Your storefront returned HTTP {check.httpStatus ?? "?"}. Check that it's online and publicly
        reachable.
      </p>
    );
  }
  if (reason === "fetch_error") {
    return (
      <p className="flex items-center gap-2 text-sm text-amber-600">
        <AlertCircle className="size-4" />
        Couldn't reach your storefront. Retrying…
      </p>
    );
  }
  // Default: not yet installed, retrying.
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Watching your storefront for the snippet…
    </p>
  );
}
