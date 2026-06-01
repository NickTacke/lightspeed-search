/**
 * Tiny entrypoint dropped into a customer storefront. Reads its own <script>
 * tag's data-attributes to figure out which addons to load + the API base URL,
 * then injects child <script> tags for each addon bundle. Total payload < 2KB minified.
 */
export {};

declare global {
  interface Window {
    AIDEY_API_URL?: string;
    AIDEY_LOADED?: Set<string>;
  }
}

(function loader() {
  if (window.AIDEY_LOADED) return;
  window.AIDEY_LOADED = new Set();

  const currentScript = document.currentScript as HTMLScriptElement | null;
  const dataset = currentScript?.dataset ?? {};
  const cdn = (dataset.cdn ?? deriveCdnFromScript(currentScript) ?? "/aidey").replace(/\/$/, "");
  const apiUrl = (dataset.apiUrl ?? cdn).replace(/\/$/, "");
  window.AIDEY_API_URL = apiUrl;

  const addons = (dataset.addons ?? "alerts,search")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const addon of addons) {
    if (window.AIDEY_LOADED.has(addon)) continue;
    window.AIDEY_LOADED.add(addon);
    inject(`${cdn}/${addon}/widget.js`);
  }

  // Signal to any embedding parent (e.g. the onboarding install-verification
  // iframe) that the loader ran. Payload deliberately carries no data beyond
  // the boot marker — addons + shop info would be info-disclosure to any page
  // that frames the merchant's storefront. The receiver MUST verify event.origin.
  try {
    window.parent?.postMessage({ type: "aidey:boot" }, "*");
  } catch {
    // window.parent inaccessible (sandboxed iframe) or postMessage blocked.
  }
})();

function deriveCdnFromScript(script: HTMLScriptElement | null): string | null {
  if (!script?.src) return null;
  // e.g. https://cdn.aidey.app/loader/widget.js → https://cdn.aidey.app
  return script.src.replace(/\/loader\/widget\.js.*$/, "");
}

function inject(src: string): void {
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  document.head.appendChild(el);
}
