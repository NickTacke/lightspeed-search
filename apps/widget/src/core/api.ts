import type { PublicAlert, WidgetSearchHit } from "./types.ts";
import { resolveApiUrl } from "./types.ts";

export async function fetchAlerts(): Promise<PublicAlert[]> {
  const res = await fetch(`${resolveApiUrl()}/widget/alerts`, {
    method: "GET",
    credentials: "omit",
  });
  if (!res.ok) throw new Error(`alerts ${res.status}`);
  return (await res.json()) as PublicAlert[];
}

export async function searchProducts(query: string, limit = 10): Promise<WidgetSearchHit[]> {
  const res = await fetch(`${resolveApiUrl()}/widget/search`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "omit",
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  return (await res.json()) as WidgetSearchHit[];
}
