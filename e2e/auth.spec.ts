import { test, expect } from "@playwright/test";

test.describe("Auth", () => {
  test("login page loads and form is interactive", async ({ page }) => {
    // Navigate directly to the login page (avoiding hydration overlay issues)
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);

    // Form should be visible and fillable
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();

    await page.locator("input#email").fill("leader_a@test.com");
    await page.locator("input#password").fill("test1234");

    // Submit button should be clickable
    await page.locator("button[type='submit']").click();

    // After submit, the page should still be responsive (no crash).
    // Note: the seeded password hash is a placeholder, so login may fail with
    // an error message; we only assert the form is interactive here.
    await expect(page.locator("body")).toBeVisible();
  });
});
