import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: "passthrough",
  }),
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
    // 移除 ssr.external 配置 - Cloudflare Workers 不支持 Node API
    // 如需文件操作，使用 Web File API
    define: {
      "import.meta.env.PUBLIC_API_URL": JSON.stringify(
        env.PUBLIC_API_URL || "http://localhost:8799"
      ),
      "import.meta.env.PUBLIC_AMAP_KEY": JSON.stringify(
        env.PUBLIC_AMAP_KEY || ""
      ),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/lucide-react")) {
              return "vendor-lucide";
            }
            if (
              id.includes("node_modules/react-markdown") ||
              id.includes("node_modules/remark-gfm")
            ) {
              return "vendor-markdown";
            }
          },
        },
      },
    },
  },
});
