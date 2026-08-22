import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 配置
 *
 * 用法：
 *   pnpm test:e2e          # 运行所有 E2E 测试
 *   pnpm exec playwright test --ui  # 带 UI 调试模式
 *   pnpm exec playwright test --debug  # 调试模式
 *
 * 前置：
 *   pnpm exec playwright install chromium
 */

export default defineConfig({
  testDir: "./e2e",

  // 每个测试用 1 个 worker，避免登录状态冲突
  workers: 1,

  // CI 中失败重试 2 次，减少偶发失败（观察期统计用）
  retries: process.env.CI ? 2 : 0,

  // 测试超时
  timeout: process.env.CI ? 60_000 : 30_000,

  // 报告器：list + html + json（健康度脚本解析 json）
  reporter: [
    ["list"],
    ["html", { outputFolder: "e2e-report" }],
    ["json", { outputFile: "e2e-report/results.json" }],
  ],

  use: {
    // 测试基础 URL（可通过环境变量覆盖本地端口）
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5432",

    // 保存 trace，失败时便于调试
    trace: "retain-on-failure",

    // 截图失败时保留
    screenshot: "only-on-failure",

    // 默认视口
    viewport: { width: 1280, height: 720 },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Serve the built Astro application through Wrangler so browser tests share
  // the exact persistent local bindings prepared by db:reset. The deploy
  // entrypoint is covered separately by the workerd Worker test suite.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm exec astro build && node scripts/start-e2e-server.mjs",
        url: "http://localhost:5432/api/health",
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
