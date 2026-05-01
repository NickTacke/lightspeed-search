import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { signIn } from "../../lib/auth-client.ts";

export const Route = createFileRoute("/(public)/login")({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn.magicLink({
      email,
      callbackURL: "/dashboard",
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message ?? "failed to send");
      return;
    }
    navigate({ to: "/verify", search: { email } });
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
      <h1>Sign in</h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 12 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button type="submit" disabled={submitting} style={{ padding: "8px 16px" }}>
          {submitting ? "Sending..." : "Send magic link"}
        </button>
      </form>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </main>
  );
}
