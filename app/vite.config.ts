import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Client-side only SPA. Base is relative so it can be hosted on any static path
// (GitHub Pages, a subfolder, file://-style previews, etc.).
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
