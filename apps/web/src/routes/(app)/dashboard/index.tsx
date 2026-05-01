import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "../../../lib/auth-client.ts";

export const Route = createFileRoute("/(app)/dashboard/")({
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data?.session) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();
  return (
    <main
      style={{
        maxWidth: 720,
        margin: "48px auto",
        padding: 24,
        fontFamily: "system-ui",
      }}
    >
      <h1>Dashboard</h1>
      <p>Signed in as {user.email}.</p>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          window.location.href = "/login";
        }}
        style={{ padding: "8px 16px" }}
      >
        Sign out
      </button>
    </main>
  );
}
