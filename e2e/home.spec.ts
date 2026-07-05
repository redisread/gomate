import { test, expect } from "@playwright/test";

test.describe("Home", () => {
  test("homepage loads and shows key sections", async ({ page }) => {
    await page.goto("/");

    // Brand and navigation should exist
    await expect(page.locator("body")).toContainText("GoMate");
    await expect(page.locator("body")).toContainText("Explore Locations");
    await expect(page.locator("body")).toContainText("Find Teams");

    // Hero section should be visible
    await expect(
      page.locator("body").filter({ hasText: /Discover Interesting Places|Team Up Together/i })
    ).toBeVisible();

    // No internal server error
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("navigating to /locations shows the locations page", async ({ page }) => {
    await page.goto("/locations");

    // Locations page should have a heading or card grid
    await expect(
      page.locator("body").filter({ hasText: /Explore Locations|Locations|Cities/i })
    ).toBeVisible();

    // No internal server error
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});
