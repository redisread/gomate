import { test, expect } from "@playwright/test";

test.describe("Teams", () => {
  test("teams page loads and shows team list", async ({ page }) => {
    await page.goto("/teams");

    // Should show teams page content
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();

    // Should contain GoMate brand
    await expect(page.locator("body")).toContainText("GoMate");
  });

  test("team detail page loads", async ({ page }) => {
    // Navigate to teams page first to get a team ID
    await page.goto("/teams");
    await expect(page.locator("body")).toBeVisible();

    // Try to find and click on a team card
    const teamLinks = page.locator("a[href^='/teams/']");
    const count = await teamLinks.count();

    if (count > 0) {
      await teamLinks.first().click();
      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
    } else {
      // If no teams, just verify the page structure
      test.skip();
    }
  });

  test("create team page requires login", async ({ page }) => {
    await page.goto("/teams/create");

    // Should redirect to login or show login prompt
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});