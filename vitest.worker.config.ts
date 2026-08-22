import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      main: "./dist/server/entry.mjs",
      wrangler: { configPath: "./wrangler.jsonc", environment: "production" },
    }),
  ],
  test: {
    globals: true,
    testTimeout: 30_000,
    include: ["tests/worker/**/*.test.ts"],
  },
});
