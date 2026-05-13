import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiPort = env.API_PORT ?? "3001";
  const port = Number(env.WEB_PORT ?? "5173");

  return {
    plugins: [
      TanStackRouterVite({
        routesDirectory: "./src/routes",
        generatedRouteTree: "./src/routeTree.gen.ts",
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: { "@": new URL("./src", import.meta.url).pathname },
    },
    server: {
      port,
      proxy: {
        "/api": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/auth": { target: `http://localhost:${apiPort}`, changeOrigin: true },
      },
    },
  };
});
