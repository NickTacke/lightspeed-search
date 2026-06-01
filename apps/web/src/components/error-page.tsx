import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/**
 * Branded error/not-found screen used across all router-level error boundaries.
 * Matches the marketing landing-page header so a 404/500 doesn't suddenly
 * drop the user into a context-free utility page.
 */
export function ErrorPage({
  status,
  title,
  description,
  detail,
  onRetry,
}: {
  status: "404" | "500";
  title: string;
  description: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">
            aidey
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="max-w-md text-center space-y-6">
          <p className="text-sm font-medium tracking-wider text-muted-foreground">ERROR {status}</p>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          {detail ? (
            <pre className="text-left text-xs bg-muted rounded-md p-3 overflow-auto max-h-32">
              {detail}
            </pre>
          ) : null}
          <div className="flex items-center justify-center gap-3 pt-2">
            {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
            <Button asChild variant={onRetry ? "outline" : "default"}>
              <Link to="/">Go home</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
