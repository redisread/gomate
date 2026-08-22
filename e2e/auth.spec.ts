import { test, expect } from "@playwright/test";
import { fillLoginForm } from "./helpers";
import { signUpUser } from "./fixtures";

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";

test.describe("Auth", () => {
  test("successful login redirects to home", async ({ page }) => {
    const user = await signUpUser(
      `auth-${RUN_ID}@e2e.gomate.test`,
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
