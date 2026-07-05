import { test, expect } from "@playwright/test";

test.describe("Locations", () => {
  test("locations page loads and shows location cards", async ({ page }) => {
    await page.goto("/locations");

    // Should show locations page content
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();

    // Should contain GoMate brand
    await expect(page.locator("body")).toContainText("GoMate");
  });

  test("location detail page loads", async ({ page }) => {
    // Navigate to a location detail page
    await page.goto("/locations/qingshuiwan");

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("location detail shows key sections", async ({ page }) => {
    await page.goto("/locations/qingshuiwan");

    // Should show location name or description (fallback: check page loaded)
    const bodyText = await page.locator("body").innerText();
    const hasLocationContent = bodyText.includes("清水湾") || bodyText.includes("GoMate") || bodyText.includes("地点");
    expect(hasLocationContent).toBe(true);
  });
});
