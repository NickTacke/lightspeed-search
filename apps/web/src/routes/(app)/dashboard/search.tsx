import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

interface SearchConfigDto {
  shopId: string;
  enabledFields: string[];
  fieldWeights: Record<string, number>;
  semanticThreshold: number;
  resultLimit: number;
  semanticEnabled: boolean;
  exactMatchEnabled: boolean;
}

interface WidgetConfigDto {
  shopId: string;
  widgetEnabled: boolean;
  accentColor: string | null;
  borderRadius: number | null;
  darkMode: boolean | null;
  visibleFields: string[];
  maxDropdownResults: number | null;
}

export const Route = createFileRoute("/(app)/dashboard/search")({ component: SearchPage });

function SearchPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["search-config"],
    queryFn: async () => {
      const res = await fetch("/api/search/config", { credentials: "include" });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      return res.json() as Promise<{ search: SearchConfigDto; widget: WidgetConfigDto }>;
    },
  });

  const updateSearch = useMutation({
    mutationFn: async (patch: Partial<SearchConfigDto>) => {
      const res = await fetch("/api/search/config", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-config"] }),
  });

  const updateWidget = useMutation({
    mutationFn: async (patch: Partial<WidgetConfigDto>) => {
      const res = await fetch("/api/search/widget", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["search-config"] }),
  });

  const [resultLimit, setResultLimit] = useState<number>(20);
  const [accentColor, setAccentColor] = useState<string>("");

  useEffect(() => {
    if (data?.search) setResultLimit(data.search.resultLimit);
    if (data?.widget) setAccentColor(data.widget.accentColor ?? "");
  }, [data]);

  if (isLoading)
    return (
      <main style={{ padding: 24 }}>
        <p>loading…</p>
      </main>
    );
  if (error)
    return (
      <main style={{ padding: 24 }}>
        <p style={{ color: "crimson" }}>{(error as Error).message}</p>
      </main>
    );
  if (!data) return null;

  return (
    <main style={{ maxWidth: 720, margin: "32px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>Search & widget</h1>

      <section style={{ marginBottom: 32, padding: 16, border: "1px solid #ddd", borderRadius: 4 }}>
        <h2>Search behavior</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={data.search.semanticEnabled}
            onChange={(e) => updateSearch.mutate({ semanticEnabled: e.target.checked })}
          />
          Semantic search (uses OpenAI embeddings)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={data.search.exactMatchEnabled}
            onChange={(e) => updateSearch.mutate({ exactMatchEnabled: e.target.checked })}
          />
          Exact-match boost
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Max results
          <input
            type="number"
            min={1}
            max={100}
            value={resultLimit}
            onChange={(e) => setResultLimit(Number(e.target.value))}
            onBlur={() => {
              if (resultLimit !== data.search.resultLimit) updateSearch.mutate({ resultLimit });
            }}
            style={{ marginLeft: 8, padding: 4, width: 80 }}
          />
        </label>
      </section>

      <section style={{ padding: 16, border: "1px solid #ddd", borderRadius: 4 }}>
        <h2>Widget appearance</h2>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={data.widget.widgetEnabled}
            onChange={(e) => updateWidget.mutate({ widgetEnabled: e.target.checked })}
          />
          Widget enabled on storefront
        </label>
        <label style={{ display: "block", marginBottom: 12 }}>
          Accent color
          <input
            type="text"
            placeholder="#ff5722"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            onBlur={() => {
              const next = accentColor.trim() || null;
              if (next !== data.widget.accentColor) updateWidget.mutate({ accentColor: next });
            }}
            style={{ marginLeft: 8, padding: 4 }}
          />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={data.widget.darkMode === true}
            onChange={(e) => updateWidget.mutate({ darkMode: e.target.checked })}
          />
          Dark mode
        </label>
      </section>
    </main>
  );
}
