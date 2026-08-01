import type { Page } from "@playwright/test";

/**
 * 测试账号按环境切换：
 * - staging（E2E_BASE_URL 指向 staging.gomate.live）：seed-staging.mjs 07-06 起创建的
 *   *-staging@gomate.test 账号（密码 test1234）
 * - 本地（默认）：api/db/seed-mobile-test.ts 创建的 admin/leader_a/member_a@test.com
 * 均可用环境变量覆盖。
 */
const IS_STAGING = (process.env.E2E_BASE_URL || "").includes("staging.gomate.live");

export const STAGING_ACCOUNTS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || (IS_STAGING ? "admin-staging@gomate.test" : "admin@test.com"),
    password: process.env.E2E_ADMIN_PASSWORD || "test1234",
  },
  leader: {
    email: process.env.E2E_LEADER_EMAIL || (IS_STAGING ? "leader-staging@gomate.test" : "leader_a@test.com"),
    password: process.env.E2E_LEADER_PASSWORD || "test1234",
  },
  member: {
    email: process.env.E2E_MEMBER_EMAIL || (IS_STAGING ? "member-staging@gomate.test" : "member_a@test.com"),
    password: process.env.E2E_MEMBER_PASSWORD || "test1234",
  },
} as const;

/**
 * 等待登录页 React island hydration 完成，然后填写邮箱/密码。
 *
 * 登录表单的 input 是 React controlled component；如果在 hydration 完成前 fill，
 * React 会在接管 DOM 时把值清掉，导致提交时邮箱为空、HTML5 验证拦截。
 */
export async function fillLoginForm(page: Page, email: string, password: string) {
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator("[data-testid='login-email']");
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);
  await page.locator("[data-testid='login-password']").fill(password);
}

/** 使用任意测试账号登录 */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await fillLoginForm(page, email, password);
  await page.locator("[data-testid='login-submit']").click();
  // 等待登录接口响应完成，避免在 CI 慢机器上还没收到响应就判断超时
  // Better Auth 的 basePath 是 /auth，实际请求为 /auth/sign-in/email
  await page.waitForResponse(/\/auth\//, { timeout: 30000 }).catch(() => null);
  // 登录后可能重定向到 / 或 /en/ 等同义词，用正则匹配首页路径
  await page.waitForURL(/\/$/, { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");
}

/** 使用 admin 测试账号登录 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, STAGING_ACCOUNTS.admin.email, STAGING_ACCOUNTS.admin.password);
}

