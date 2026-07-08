import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 配置
 *
 * 用法：
 *   pnpm e2e          # 运行所有 E2E 测试
 *   pnpm e2e:ui       # 带 UI 调试模式
 *   pnpm e2e:debug    # 调试模式
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
    // 测试基础 URL（可通过环境变量覆盖，用于 staging 测试）
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
    {
      name: "chromium-staging",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.E2E_BASE_URL || "https://staging.gomate.live",
      },
    },
  ],

  // 自动启动本地开发服务器（仅在非 staging 测试时）
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "pnpm dev:fresh",
        url: "http://localhost:5432",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
