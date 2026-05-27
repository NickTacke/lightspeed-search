import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiUrl } from "@/lib/api";

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
  const { data, isLoading } = useQuery({
    queryKey: ["search-config"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/search/config"), { credentials: "include" });
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      return res.json() as Promise<{ search: SearchConfigDto; widget: WidgetConfigDto }>;
    },
  });

  const updateSearch = useMutation({
    mutationFn: async (patch: Partial<SearchConfigDto>) => {
      const res = await fetch(apiUrl("/api/search/config"), {
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
      const res = await fetch(apiUrl("/api/search/widget"), {
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
      <div className="p-8">
        <p className="text-muted-foreground">loading…</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Search & widget</h1>
        <p className="text-muted-foreground mt-1">
          Tune search behavior and how the widget looks on your storefront.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Search behavior</CardTitle>
          <CardDescription>
            Hybrid (lexical + semantic) by default. Toggle off semantic to use lexical only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="semanticEnabled" className="cursor-pointer">
              Semantic search (uses OpenAI embeddings)
            </Label>
            <Switch
              id="semanticEnabled"
              checked={data.search.semanticEnabled}
              onCheckedChange={(checked) => updateSearch.mutate({ semanticEnabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="exactMatchEnabled" className="cursor-pointer">
              Exact-match boost
            </Label>
            <Switch
              id="exactMatchEnabled"
              checked={data.search.exactMatchEnabled}
              onCheckedChange={(checked) => updateSearch.mutate({ exactMatchEnabled: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resultLimit">Max results</Label>
            <Input
              id="resultLimit"
              type="number"
              min={1}
              max={100}
              value={resultLimit}
              onChange={(e) => setResultLimit(Number(e.target.value))}
              onBlur={() => {
                if (resultLimit !== data.search.resultLimit) updateSearch.mutate({ resultLimit });
              }}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Widget appearance</CardTitle>
          <CardDescription>How the widget looks on your storefront.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="widgetEnabled" className="cursor-pointer">
              Widget enabled on storefront
            </Label>
            <Switch
              id="widgetEnabled"
              checked={data.widget.widgetEnabled}
              onCheckedChange={(checked) => updateWidget.mutate({ widgetEnabled: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent color</Label>
            <Input
              id="accentColor"
              type="text"
              placeholder="#ff5722"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              onBlur={() => {
                const next = accentColor.trim() || null;
                if (next !== data.widget.accentColor) updateWidget.mutate({ accentColor: next });
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="darkMode" className="cursor-pointer">
              Dark mode
            </Label>
            <Switch
              id="darkMode"
              checked={data.widget.darkMode === true}
              onCheckedChange={(checked) => updateWidget.mutate({ darkMode: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
