import { getApiHealthOptions } from "@aidey/api-client/tanstack";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data, isLoading } = useQuery(getApiHealthOptions());
  if (isLoading) return <p>loading...</p>;
  return (
    <main style={{ padding: 24 }}>
      <h1>aidey</h1>
      <p>
        API status: {data?.status}, uptime {data?.uptime}s
      </p>
    </main>
  );
}
