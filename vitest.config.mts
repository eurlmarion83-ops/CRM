import { defineConfig } from "vitest/config";
import path from "node:path";

const rootDir = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
});
