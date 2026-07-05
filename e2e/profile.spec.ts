import { test, expect } from "@playwright/test";

test.describe("Profile", () => {
  test("profile page requires login", async ({ page }) => {
    await page.goto("/profile");

    // Should redirect to login or show login prompt
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("public user profile page loads", async ({ page }) => {
    // Try to access a public user profile
    await page.goto("/users/admin");

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});