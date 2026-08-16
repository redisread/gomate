import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { defineConfig, sessionDrivers } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

const persistStatePath = resolve(
  process.env.GOMATE_LOCAL_STATE || join(homedir(), ".gomate", "wrangler-state")
);

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    configPath: process.env.GOMATE_WRANGLER_CONFIG ?? "./wrangler.jsonc",
    imageService: "passthrough",
    persistState: { path: persistStatePath },
  }),
  session: {
    driver: sessionDrivers.lruCache({ max: 1 }),
  },
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
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // 图标库在多个 island 中复用，保持为稳定共享 chunk。
            // Markdown 只在少数内容型页面使用，不强制注入所有页面的共享 chunk，
            // 避免首页、地点列表和队伍列表承担无关的 React/Markdown 依赖。
            'vendor-lucide': ['lucide-react'],
          },
        },
      },
    },
  },
});
