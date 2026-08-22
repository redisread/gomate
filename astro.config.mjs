import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const persistStatePath = resolve(
  process.env.GOMATE_LOCAL_STATE ||
    join(homedir(), ".gomate", "wrangler-state"),
);

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    configPath: process.env.GOMATE_WRANGLER_CONFIG ?? "./wrangler.jsonc",
    imageService: "passthrough",
    persistState: { path: persistStatePath },
  }),
  // Better Auth owns sessions in D1; Astro's optional session driver would
  // otherwise provision a second KV-backed session store.
  session: false,
  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en", "ja"],
    // Locale redirects and prefix rewrites are owned by src/middleware.ts.
    // Astro's automatic finalizer would otherwise see the rewritten URL and
    // redirect it again, creating a loop for non-default Accept-Language.
    routing: "manual",
  },
  integrations: [react()],
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  server: {
    port: 5432,
  },
  vite: {
    resolve: {
      // Cloudflare Workers disallow runtime WebAssembly.compile(). Astro's
      // action scanner only needs the pure-JavaScript lexer implementation.
      alias: [
        {
          find: /^es-module-lexer$/,
          replacement: fileURLToPath(
            new URL("./scripts/es-module-lexer-worker.mjs", import.meta.url),
          ),
        },
      ],
    },
    plugins: [tailwindcss()],
  },
});
