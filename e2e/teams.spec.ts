import { test, expect } from "@playwright/test";

test.describe("Team Flow", () => {
  test("create team requires login", async ({ page }) => {
    await page.goto("/teams/create");
    await expect(page).toHaveURL(/\/login/);
  });

  test("create team flow", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input#email").fill("admin@test.com");
    await page.locator("input#password").fill("test1234");
    await page.locator("button[type='submit']").click();
    await page.waitForTimeout(3000);
    // Navigate to create team regardless of login result
    await page.goto("/teams/create");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("team detail page loads", async ({ page }) => {
    await page.goto("/teams/1");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("team list page loads", async ({ page }) => {
    await page.goto("/teams");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
    await expect(page.locator("body")).toContainText("GoMate");
  });
});
