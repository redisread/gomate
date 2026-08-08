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

  // 自动启动本地开发服务器。
  // CI 中拆分为 api + web 两个独立服务，确保 API 完全 ready 后再跑测试，
  // 避免登录请求打到尚未初始化好 D1 的 API 上。
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : process.env.CI
      ? [
          {
            command: "pnpm api:dev",
            url: "http://localhost:8799/health",
            reuseExistingServer: false,
            timeout: 120_000,
          },
          {
            command: "pnpm web:dev",
            url: "http://localhost:5432",
            reuseExistingServer: false,
            timeout: 180_000,
            env: {
              PUBLIC_API_URL:
                process.env.PUBLIC_API_URL || "http://localhost:8799",
            },
          },
        ]
      : {
          command: "pnpm dev:fresh",
          url: "http://localhost:5432",
          reuseExistingServer: true,
          timeout: 180_000,
        },
});
