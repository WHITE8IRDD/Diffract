import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

// Diffract — build configuration.
//
// The frontend is a plain Vite + React 19 SPA that runs:
//   * inside the Tauri v2 shell (production desktop app), and
//   * in a normal browser tab (development / UI preview).
//
// Tauri expects the dev server on a fixed port and the production bundle in
// `dist/`. `beforeDevCommand` / `devUrl` in `src-tauri/tauri.conf.json` must
// stay in sync with the values below.

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // Tauri uses Chromium on Windows (WebView2). Target modern Chromium.
  build: {
    target: "chrome110",
    minify: "oxc",
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // Keep pixi in its own chunk so the shell paints fast on cold start
        // (launch budget: < 2 s). Vite 8/Rolldown requires the function form.
        manualChunks(id: string) {
          if (id.includes("node_modules/pixi.js") || id.includes("node_modules/@pixi/")) {
            return "pixi";
          }
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/scheduler")
          ) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // Tauri dev opens the app from this origin; allow it to load assets.
    // `allowedHosts` accepts the proxied preview host as well as localhost.
    cors: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    cors: true,
    allowedHosts: true,
  },
  clearScreen: false,
});
