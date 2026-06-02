import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

// Baked into the loader bundle at build time. Default to prod; override
// via AIDEY_API_URL=... at build time for staging/dev loaders. Used as the
// default for window.AIDEY_API_URL when the snippet doesn't pass data-api-url.
const AIDEY_API_URL = process.env.AIDEY_API_URL ?? "https://api.aidey.app";

export default defineConfig({
  plugins: [preact()],
  define: {
    __AIDEY_API_URL__: JSON.stringify(AIDEY_API_URL),
  },
  build: {
    outDir: "dist/loader",
    emptyOutDir: true,
    lib: {
      entry: "src/loader/index.ts",
      formats: ["iife"],
      name: "AideyLoader",
      fileName: () => "widget.js",
    },
    rollupOptions: {
      output: {
        // Inline everything; the loader is tiny and shouldn't fetch helpers
        inlineDynamicImports: true,
      },
    },
  },
});
