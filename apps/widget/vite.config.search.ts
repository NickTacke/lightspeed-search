import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
  server: { port: 5175 },
  build: {
    outDir: "dist/search",
    emptyOutDir: true,
    lib: {
      entry: "src/search/index.tsx",
      formats: ["iife"],
      name: "AideySearch",
      fileName: () => "widget.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
