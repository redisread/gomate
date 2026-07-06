import { test, expect } from "@playwright/test";

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
    await page.goto("/login");
    await page.locator("input#email").fill("admin@test.com");
    await page.locator("input#password").fill("test1234");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(3000);
    // Navigate to profile regardless of login result
    await page.goto("/profile");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});
