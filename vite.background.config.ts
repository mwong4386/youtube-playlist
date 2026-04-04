import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "build",
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/background/index.ts"),
      formats: ["iife"],
      name: "YoutubePlaylistBackground",
      fileName: () => "static/js/background.js",
    },
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
});
