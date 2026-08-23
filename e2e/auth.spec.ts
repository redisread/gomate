import { test, expect } from "@playwright/test";
import { fillLoginForm } from "./helpers";
import { signUpUser } from "./fixtures";

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";

test.describe("Auth", () => {
  test("registration form reaches email verification state", async ({ page }) => {
    await page.goto("/register");
    await page.waitForLoadState("networkidle");
    await page.locator("[data-testid='register-name']").fill(`Register ${RUN_ID}`);
    await page.locator("[data-testid='register-email']").fill(
      `register-${RUN_ID}@gmail.com`,
    );
    await page.locator("[data-testid='register-password']").fill(PASSWORD);
    await page.locator("[data-testid='register-confirm-password']").fill(PASSWORD);

    const signupResponse = page.waitForResponse(/\/api\/auth\/sign-up\/email/);
    await page.locator("[data-testid='register-submit']").click();
    expect((await signupResponse).status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 2, name: /注册成功|Registration Successful!/u }),
    ).toBeVisible();
  });

  test("successful login redirects to home", async ({ page }) => {
    const user = await signUpUser(
      `auth-${RUN_ID}@gmail.com`,
      PASSWORD,
      `Auth ${RUN_ID}`,
    );
    await page.goto("/login");
    await fillLoginForm(page, user.email, user.password);
    await page.locator("[data-testid='login-submit']").click();
    // Deterministic assertion: wait for navigation to home
    await page.waitForURL(/\/$/, { timeout: 30000 });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("body")).toContainText("GoMate");
  });
});
