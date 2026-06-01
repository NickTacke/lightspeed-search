import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const LOADER_URL = import.meta.env.VITE_WIDGET_LOADER_URL as string | undefined;
const VERIFY_TIMEOUT_MS = 30_000;

function OnboardingInstall() {
  const navigate = useNavigate();
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
  const storefrontOrigin = (() => {
    try {
      return new URL(storefrontUrl).origin;
    } catch {
      return null;
    }
  })();

  const [verified, setVerified] = useState<"pending" | "success" | "failure">("pending");
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for the loader's boot postMessage. Strict origin check stops any
  // page from spoofing a "verified" state by guessing the message shape.
  useEffect(() => {
    if (!storefrontOrigin) {
      setVerified("failure");
      return;
    }
    const handler = (event: MessageEvent) => {
      if (event.origin !== storefrontOrigin) return;
      if (typeof event.data !== "object" || event.data === null) return;
      if ((event.data as { type?: unknown }).type !== "aidey:boot") return;
      setVerified("success");
    };
    window.addEventListener("message", handler);
    const timer = setTimeout(() => {
      setVerified((prev) => (prev === "pending" ? "failure" : prev));
    }, VERIFY_TIMEOUT_MS);
    return () => {
      window.removeEventListener("message", handler);
      clearTimeout(timer);
    };
  }, [storefrontOrigin]);

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function retry() {
    setVerified("pending");
    iframeRef.current?.contentWindow?.location.reload();
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

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Live storefront preview</span>
            <VerifyIndicator verified={verified} />
          </div>
          <iframe
            ref={iframeRef}
            src={storefrontUrl}
            title="Storefront verification"
            className="aspect-video w-full rounded-md border"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        <div className="flex justify-end gap-2">
          {verified === "failure" ? (
            <Button variant="outline" onClick={retry}>
              Retry
            </Button>
          ) : null}
          <Button
            onClick={() => navigate({ to: "/dashboard" })}
            disabled={verified !== "success"}
            variant={verified === "success" ? "default" : "outline"}
          >
            {verified === "success" ? "Continue" : "Skip for now"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VerifyIndicator({ verified }: { verified: "pending" | "success" | "failure" }) {
  if (verified === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-emerald-600">
        <CheckCircle2 className="size-4" />
        Verified
      </span>
    );
  }
  if (verified === "failure") {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-destructive">
        <AlertCircle className="size-4" />
        Not detected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Waiting…
    </span>
  );
}
