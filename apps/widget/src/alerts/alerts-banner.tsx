import { useEffect, useState } from "preact/hooks";
import { fetchAlerts } from "../core/api.ts";
import { applyTheme, readHostTheme } from "../core/theme-adapter.ts";
import type { PublicAlert } from "../core/types.ts";

export function AlertsBanner() {
  const [alerts, setAlerts] = useState<PublicAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAlerts()
      .then((items) => setAlerts(items.filter((a) => a.enabled)))
      .catch((err) => console.warn("[aidey] alerts fetch failed", err));
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div
      ref={(el) => {
        if (el) applyTheme(el, readHostTheme());
      }}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      {alerts
        .filter((a) => !dismissed.has(a.id))
        .map((a) => (
          <div
            key={a.id}
            style={{
              padding: "12px 16px",
              background: "var(--aidey-accent, #2563eb)",
              color: "white",
              borderRadius: "var(--aidey-radius, 4px)",
              fontFamily: "var(--aidey-font, system-ui, sans-serif)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <strong>{a.title}</strong>
              {a.message && <p style={{ margin: "4px 0 0" }}>{a.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => setDismissed((prev) => new Set([...prev, a.id]))}
              style={{
                background: "transparent",
                color: "inherit",
                border: "none",
                cursor: "pointer",
                fontSize: 18,
              }}
              aria-label="dismiss"
            >
              ×
            </button>
          </div>
        ))}
    </div>
  );
}
