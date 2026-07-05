import { test, expect } from "@playwright/test";

test.describe("Staging Smoke", () => {
  test("homepage loads without errors", async ({ page }) => {
    await page.goto("/");

    // Page should load and contain GoMate brand
    await expect(page.locator("body")).toContainText("GoMate");

    // No internal server error
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("API health check is reachable", async ({ request }) => {
    // Use the API URL directly for backend health check
    const apiUrl = process.env.PUBLIC_API_URL || "https://api-staging.gomate.live";
    const response = await request.get(`${apiUrl}/health`);
    expect(response.status()).toBe(200);
  });

  test("locations page loads", async ({ page }) => {
    await page.goto("/locations");

    // Should show locations page content or empty state
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator("form")).toBeVisible();
  });
});
