import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(__dirname, "src"),
    },
  },
  test: {
    exclude: ["tests/playwright/**"],
    globals: true,
    include: ["src/**/__tests__/**/*.ts"],
  },
});
