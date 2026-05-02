import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/(public)/pricing")({ component: Pricing });

interface Tier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    description: "Try Aidey on a single storefront.",
    features: [
      "Up to 1 connected shop",
      "1,000 search queries / month",
      "5 active alerts",
      "Community support",
    ],
    cta: "Start free",
  },
  {
    name: "Pro",
    price: "$29",
    description: "For growing shops.",
    features: [
      "Unlimited shops",
      "100k search queries / month",
      "Unlimited alerts",
      "Email support",
      "Custom widget styling",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For high-volume merchants.",
    features: [
      "Unlimited everything",
      "SLA & priority support",
      "Dedicated infrastructure",
      "Custom integrations",
    ],
    cta: "Contact sales",
  },
];

function Pricing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">
            aidey
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link to="/login">Sign in</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Simple pricing</h1>
          <p className="text-xl text-muted-foreground">Start free. Pay when you scale.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <Card key={tier.name} className={tier.highlighted ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{tier.name}</CardTitle>
                  {tier.highlighted && <Badge>Popular</Badge>}
                </div>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.price !== "Custom" && <span className="text-muted-foreground">/mo</span>}
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  asChild
                  className="w-full"
                  variant={tier.highlighted ? "default" : "outline"}
                >
                  <Link to="/login">{tier.cta}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </main>

      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between text-sm text-muted-foreground">
          <span>© aidey</span>
        </div>
      </footer>
    </div>
  );
}
