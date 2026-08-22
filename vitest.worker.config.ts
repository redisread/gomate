import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./tests/worker/entry.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    globals: true,
    testTimeout: 30_000,
    include: ["tests/worker/**/*.test.ts"],
  },
});
