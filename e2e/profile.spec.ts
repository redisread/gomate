import { test, expect } from "@playwright/test";

async function loginAsAdmin(page) {
  await page.goto("/login");
  await page.locator("[data-testid='login-email']").fill("admin@test.com");
  await page.locator("[data-testid='login-password']").fill("test1234");
  await page.locator("[data-testid='login-submit']").click();
  await page.waitForURL("/", { timeout: 5000 });
}

test.describe("Profile", () => {
  test("profile page requires login", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("public profile page loads", async ({ page }) => {
    await page.goto("/users/1");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("profile page loads when logged in", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});
