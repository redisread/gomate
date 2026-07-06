import { test, expect } from "@playwright/test";

async function fillLoginForm(page, email: string, password: string) {
  // Wait for React island hydration so controlled inputs keep their values
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator("[data-testid='login-email']");
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill(email);
  await page.locator("[data-testid='login-password']").fill(password);
}

test.describe("Auth", () => {
  test("login page loads and form is interactive", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("[data-testid='login-email']")).toBeVisible();
    await expect(page.locator("[data-testid='login-password']")).toBeVisible();
    await fillLoginForm(page, "leader_a@test.com", "test1234");
    await page.locator("[data-testid='login-submit']").click();
    await expect(page.locator("body")).toBeVisible();
  });

  test("successful login redirects to home", async ({ page }) => {
    await page.goto("/login");
    await fillLoginForm(page, "admin@test.com", "test1234");
    await page.locator("[data-testid='login-submit']").click();
    // Deterministic assertion: wait for navigation to home
    await page.waitForURL("/", { timeout: 15000 });
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
    await expect(page.locator("[data-testid='register-password']")).toBeVisible();
    await expect(page.locator("[data-testid='register-confirm-password']")).toBeVisible();
  });
});
