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
    // vitest-plugin 1.4.4 can inline warm modules into a >32 MiB RPC frame.
    // https://github.com/cloudflare/workers-sdk/issues/16349
    fsModuleCache: false,
    testTimeout: 30_000,
    include: ["tests/worker/**/*.test.ts"],
  },
});
