export interface PublicAlert {
  id: string;
  title: string;
  message: string;
  enabled: boolean;
}

export interface WidgetSearchHit {
  productId: string;
  title: string;
  image: string | null;
  brand: string | null;
  price: string | null;
  score: number;
}

/** Resolves the API base URL from the host script tag's data-attribute or a global. */
export function resolveApiUrl(): string {
  // Prefer global set by the loader; fall back to current origin (for dev harness).
  const winAny = window as unknown as { AIDEY_API_URL?: string };
  if (winAny.AIDEY_API_URL) return winAny.AIDEY_API_URL.replace(/\/$/, "");
  return window.location.origin;
}
