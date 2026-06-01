import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiUrl, isSafeNext } from "@/lib/api";

const searchSchema = z.object({
  email: z.email().optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/(public)/verify")({
  component: Verify,
  validateSearch: (s) => searchSchema.parse(s),
});

function Verify() {
  const { email, next: rawNext } = Route.useSearch();
  // Reject anything that doesn't resolve to web or api origin — stops open
  // redirects via crafted ?next= links.
  const safeNext = isSafeNext(rawNext) ? rawNext : undefined;
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const callbackURL = safeNext ?? `${window.location.origin}/dashboard`;
    const res = await fetch(apiUrl("/auth/verify-code"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      // callbackURL must be absolute — Better Auth uses it as the 302 Location.
      // Relative paths resolve against api.aidey.app and 404 the SPA.
      body: JSON.stringify({ code, callbackURL }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("invalid or expired code");
      return;
    }
    // When `next` points off-app (e.g. /api/oauth/lightspeed/start), do a hard
    // navigation so we actually leave the SPA; the router can't reach it.
    if (safeNext) {
      window.location.href = safeNext;
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Enter your code</CardTitle>
          <CardDescription>
            Check {email ?? "your email"} for a 6-digit code (or click the link in the email).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-2xl tracking-[0.4em] h-14"
              placeholder="••••••"
            />
            <Button type="submit" disabled={submitting || code.length !== 6} className="w-full">
              {submitting ? "Verifying…" : "Verify"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
