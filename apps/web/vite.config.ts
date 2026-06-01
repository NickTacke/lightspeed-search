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
    build: {
      sourcemap: true,
    },
    define: {
      "import.meta.env.VITE_GIT_SHA": JSON.stringify(process.env.VITE_GIT_SHA ?? "dev"),
    },
    server: {
      port,
      proxy: {
        // Every path the api owns; the SPA only owns /, /login, /verify, /pricing,
        // /onboarding/*, /dashboard/*. Anything else routes to the api.
        "/shops": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/alerts": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/sync": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/search": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/oauth": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/health": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/auth": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/widget": { target: `http://localhost:${apiPort}`, changeOrigin: true },
        "/lightspeed": { target: `http://localhost:${apiPort}`, changeOrigin: true },
      },
    },
  };
});
