import { defineConfig } from "vite";

// base "./" keeps the build portable (GitHub Pages, any static host).
export default defineConfig({
  base: "./",
  test: { environment: "node" },
} as any);
