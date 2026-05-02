import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
  server: { port: 5174 },
  build: {
    outDir: "dist/alerts",
    emptyOutDir: true,
    lib: {
      entry: "src/alerts/index.tsx",
      formats: ["iife"],
      name: "AideyAlerts",
      fileName: () => "widget.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
