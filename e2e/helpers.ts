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

/** 使用 admin 测试账号登录 */
export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await fillLoginForm(page, "admin@test.com", "test1234");
  await page.locator("[data-testid='login-submit']").click();
  await page.waitForURL("/", { timeout: 15000 });
  await page.waitForLoadState("domcontentloaded");
}
