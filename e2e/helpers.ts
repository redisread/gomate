import type { Page } from "@playwright/test";

/**
 * staging 种子账号（scripts/seed-staging.mjs 07-06 起创建，密码均为 test1234）。
 * 旧账号体系（admin@test.com / leader_a@test.com 等）在 staging D1 已不存在，勿再引用。
 * 可用环境变量覆盖以指向其他环境。
 */
export const STAGING_ACCOUNTS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || "admin-staging@gomate.test",
    password: process.env.E2E_ADMIN_PASSWORD || "test1234",
  },
  leader: {
    email: process.env.E2E_LEADER_EMAIL || "leader-staging@gomate.test",
    password: process.env.E2E_LEADER_PASSWORD || "test1234",
  },
  member: {
    email: process.env.E2E_MEMBER_EMAIL || "member-staging@gomate.test",
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

/** 在队伍列表页通过标题找到队伍，点击进入详情页，返回队伍 ID */
export async function gotoTeamByTitle(page: Page, title: string) {
  await page.goto("/teams");
  await page.waitForLoadState("domcontentloaded");
  // 等待骨架屏消失、真实卡片渲染
  await page.waitForSelector("[class*='skeleton']", { state: "detached", timeout: 10000 }).catch(() => null);
  const card = page.locator("a[href^='/teams/']").filter({ hasText: title });
  await card.first().waitFor({ state: "visible", timeout: 10000 });
  await card.first().click();
  await page.waitForURL(/\/teams\/.+/, { timeout: 5000 });
  const match = page.url().match(/\/teams\/([^/]+)/);
  return match ? match[1] : "";
}
