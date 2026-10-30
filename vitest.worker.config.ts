import {
  cloudflareTest,
  readD1Migrations,
} from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [
    cloudflareTest({
      main: "./dist/server/entry.mjs",
      wrangler: { configPath: "./wrangler.jsonc", environment: "production" },
      miniflare: {
        bindings: { TEST_MIGRATIONS: JSON.stringify(migrations) },
      },
    }),
  ],
  test: {
    globals: true,
    testTimeout: 30_000,
    include: ["tests/worker/**/*.test.ts"],
  },
});
