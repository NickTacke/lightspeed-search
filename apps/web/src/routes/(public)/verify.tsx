import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

const searchSchema = z.object({ email: z.email().optional() });

export const Route = createFileRoute("/(public)/verify")({
  component: Verify,
  validateSearch: (s) => searchSchema.parse(s),
});

function Verify() {
  const { email } = Route.useSearch();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const res = await fetch("/auth/verify-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, callbackURL: "/dashboard" }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError("invalid or expired code");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <main
      style={{
        maxWidth: 360,
        margin: "48px auto",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <h1>Enter your code</h1>
      <p>Check {email ?? "your email"} for a 6-digit code (or click the link in the email).</p>
      <form onSubmit={onSubmit}>
        <input
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ fontSize: 24, letterSpacing: 4, padding: 8, width: "100%" }}
        />
        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          style={{ marginTop: 12, padding: "8px 16px" }}
        >
          {submitting ? "Verifying..." : "Verify"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}
