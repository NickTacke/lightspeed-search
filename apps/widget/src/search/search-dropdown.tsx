import { useEffect, useRef, useState } from "preact/hooks";
import { searchProducts } from "../core/api.ts";
import { applyTheme, readHostTheme } from "../core/theme-adapter.ts";
import type { WidgetSearchHit } from "../core/types.ts";

export function SearchDropdown() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<WidgetSearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (containerRef.current) applyTheme(containerRef.current, readHostTheme());
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchProducts(query.trim(), 10);
        setHits(results);
        setOpen(true);
      } catch (err) {
        console.warn("[aidey] search failed", err);
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        maxWidth: 480,
        fontFamily: "var(--aidey-font, system-ui, sans-serif)",
      }}
    >
      <input
        type="search"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search products…"
        style={{
          width: "100%",
          padding: "10px 12px",
          fontSize: 16,
          border: "1px solid #ccc",
          borderRadius: "var(--aidey-radius, 4px)",
        }}
      />
      {open && (loading || hits.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #eee",
            borderRadius: "var(--aidey-radius, 4px)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
            maxHeight: 360,
            overflowY: "auto",
            zIndex: 9999,
          }}
        >
          {loading && <div style={{ padding: 12, color: "#999" }}>Searching…</div>}
          {!loading && hits.length === 0 && (
            <div style={{ padding: 12, color: "#999" }}>No results</div>
          )}
          {!loading &&
            hits.map((h) => (
              <div
                key={h.productId}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: 12,
                  borderBottom: "1px solid #f0f0f0",
                  cursor: "pointer",
                }}
              >
                {h.image && (
                  <img
                    src={h.image}
                    alt=""
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "cover",
                      borderRadius: "var(--aidey-radius, 4px)",
                    }}
                  />
                )}
                <div>
                  {h.brand && <div style={{ color: "#666", fontSize: 12 }}>{h.brand}</div>}
                  <div style={{ fontWeight: 500 }}>{h.title}</div>
                  {h.price && <div style={{ marginTop: 4 }}>{h.price}</div>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
