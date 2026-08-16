import type { Page } from "@playwright/test";

let browserClientIpSequence = 10;

async function isolateAuthRateLimitBucket(page: Page) {
  const octet = browserClientIpSequence;
  browserClientIpSequence = browserClientIpSequence >= 249
    ? 10
    : browserClientIpSequence + 1;
  // Miniflare accepts the Cloudflare client-IP header. Production Cloudflare
  // overwrites it, while local E2E uses a distinct bucket per isolated user.
  await page.context().setExtraHTTPHeaders({
    "CF-Connecting-IP": `203.0.113.${octet}`,
  });
}

/**
 * 等待登录页 React island hydration 完成，然后填写邮箱/密码。
 *
 * 登录表单的 input 是 React controlled component；如果在 hydration 完成前 fill，
 * React 会在接管 DOM 时把值清掉，导致提交时邮箱为空、HTML5 验证拦截。
 */
export async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
) {
  await isolateAuthRateLimitBucket(page);
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
  // Better Auth is mounted below the unified Worker's /api prefix.
  await page.waitForResponse(/\/api\/auth\//, { timeout: 30000 }).catch(() => null);
  // 登录后可能重定向到 / 或 /en/ 等同义词，用正则匹配首页路径
  await page.waitForURL(/\/$/, { timeout: 30000 });
  await page.waitForLoadState("domcontentloaded");
}
