import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
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
