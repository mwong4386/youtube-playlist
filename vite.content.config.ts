import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "build",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/contentScript/index.ts"),
      formats: ["iife"],
      name: "YoutubePlaylistContentScript",
      fileName: () => "static/js/contentScript.js",
    },
    rollupOptions: {
      output: {
        extend: true,
        intro:
          "var process = globalThis.process || (globalThis.process = { env: {} }); process.env = process.env || {}; process.env.NODE_ENV = process.env.NODE_ENV || 'production';",
      },
    },
  },
});
