import { defineConfig } from "vite";
import { resolve } from "node:path";

// Tauri picks up env vars prefixed with TAURI_
// https://tauri.app/v2/guides/ecosystem/vite/

export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: "127.0.0.1",
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "safari15",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        capture: resolve(__dirname, "capture.html"),
        settings: resolve(__dirname, "settings.html"),
      },
    },
  },
});
