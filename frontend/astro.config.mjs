import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  i18n: {
    defaultLocale: "zh-CN",
    locales: ["zh-CN", "en", "ja"],
    routing: {
      prefixDefaultLocale: false,
      fallback: {
        ja: "en",
      },
    },
  },
  integrations: [react()],
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  server: {
    port: 5432,
  },
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ["node:fs", "node:path"],
    },
    define: {
      "import.meta.env.PUBLIC_API_URL": JSON.stringify(
        env.PUBLIC_API_URL || "http://localhost:8799"
      ),
      "import.meta.env.PUBLIC_AMAP_KEY": JSON.stringify(
        env.PUBLIC_AMAP_KEY || ""
      ),
    },
  },
});
