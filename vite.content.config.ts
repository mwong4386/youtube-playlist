import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
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
      },
    },
  },
});
