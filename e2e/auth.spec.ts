import { test, expect } from "@playwright/test";
import { fillLoginForm } from "./helpers";
import { signUpUser } from "./fixtures";

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";

test.describe("Auth", () => {
  test("login page loads and form is interactive", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("[data-testid='login-email']")).toBeVisible();
    await expect(page.locator("[data-testid='login-password']")).toBeVisible();
    await fillLoginForm(page, `interactive-${RUN_ID}@e2e.gomate.test`, PASSWORD);
    await expect(page.locator("[data-testid='login-submit']")).toBeEnabled();
  });

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

  test("invalid credentials show error or stay on login", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, "nonexistent@test.com", "wrongpassword");
    await page.locator("[data-testid='login-submit']").click();
    // Wait for any navigation or response to settle, then assert we remain on login
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/login/);
  });

  test("register page loads and form is interactive", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("[data-testid='register-name']")).toBeVisible();
    await expect(page.locator("[data-testid='register-email']")).toBeVisible();
    await expect(
      page.locator("[data-testid='register-password']"),
    ).toBeVisible();
    await expect(
      page.locator("[data-testid='register-confirm-password']"),
    ).toBeVisible();
  });
});
