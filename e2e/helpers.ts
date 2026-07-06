import type { Page } from "@playwright/test";

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
  // 登录后可能重定向到 / 或 /en/ 等同义词，用正则匹配首页路径
  await page.waitForURL(/\/$/, { timeout: 15000 });
  await page.waitForLoadState("domcontentloaded");
}

/** 使用 admin 测试账号登录 */
export async function loginAsAdmin(page: Page) {
  await loginAs(page, "admin@test.com", "test1234");
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
