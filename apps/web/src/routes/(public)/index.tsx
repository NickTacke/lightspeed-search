import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_URL } from "../../lib/api";

export const Route = createFileRoute("/(public)/")({ component: Landing });

// GET form posts the user to api.aidey.app/oauth/lightspeed/start with the
// shop_id and source as query params — no JS needed, browser navigates.
const oauthStartAction = `${API_URL}/oauth/lightspeed/start`;

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">
            aidey
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Button asChild size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 py-24 text-center">
          <Badge variant="secondary" className="mb-6">
            For Lightspeed merchants
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Smart search and alerts for your storefront
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Aidey gives your shoppers semantic product search and lets you ship targeted alerts in
            seconds. Drop in one script - works with your existing theme.
          </p>
          <form
            method="GET"
            action={oauthStartAction}
            className="mx-auto flex w-full max-w-xl flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="source" value="direct" />
            <Input
              name="shop_id"
              type="text"
              inputMode="numeric"
              pattern="[0-9]+"
              required
              placeholder="Your Lightspeed shop ID"
              className="h-12 flex-1 text-base"
              aria-label="Lightspeed shop ID"
            />
            <Button type="submit" size="lg">
              Connect Lightspeed
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Find your shop ID in your Lightspeed admin URL or partner portal.{" "}
            <Link to="/pricing" className="underline hover:text-foreground">
              See pricing
            </Link>
            .
          </p>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-16 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Search className="size-8 text-primary mb-2" />
              <CardTitle>Hybrid search</CardTitle>
              <CardDescription>
                tsvector + pgvector for instant, semantic-aware product search.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tunable weights, exact-match boosts, and a sub-100ms dropdown that blends with your
              theme.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <BellRing className="size-8 text-primary mb-2" />
              <CardTitle>Storefront alerts</CardTitle>
              <CardDescription>
                Banner messages your customers see - ship in seconds, not deploys.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Targeted, dismissable, and synced with your shop's product catalog automatically.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Sparkles className="size-8 text-primary mb-2" />
              <CardTitle>One-script install</CardTitle>
              <CardDescription>
                A 600B loader. No theme edits. Inherits your design tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Drop the script into your storefront once. Toggle features and tune appearance from
              your dashboard.
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between text-sm text-muted-foreground">
          <span>© aidey</span>
          <div className="flex gap-4">
            <Link to="/pricing" className="hover:text-foreground">
              Pricing
            </Link>
            <Link to="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
