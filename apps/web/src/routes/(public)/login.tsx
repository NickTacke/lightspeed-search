import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "../../lib/auth-client";

export const Route = createFileRoute("/(public)/login")({ component: Login });

function Login() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn.magicLink({ email, callbackURL: "/dashboard" });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message ?? "failed to send");
      return;
    }
    navigate({ to: "/verify", search: { email } });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mb-2">
            ← back
          </Link>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>We'll email you a magic link and a 6-digit code.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Sending…" : "Send magic link"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
