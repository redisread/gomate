import { test, expect } from "@playwright/test";

async function loginAsAdmin(page) {
  await page.goto("/login");
  // Wait for React island hydration so controlled inputs keep their values
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator("[data-testid='login-email']");
  await emailInput.waitFor({ state: "visible" });
  await emailInput.fill("admin@test.com");
  await page.locator("[data-testid='login-password']").fill("test1234");
  await page.locator("[data-testid='login-submit']").click();
  await page.waitForURL("/", { timeout: 15000 });
  await page.waitForLoadState("domcontentloaded");
}

test.describe("Team Flow", () => {
  test("create team requires login", async ({ page }) => {
    await page.goto("/teams/create");
    // Wait patiently for the auth redirect to complete (i18n routing may add locale prefix)
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("create team flow", async ({ page }) => {
    await loginAsAdmin(page);

    // Navigate to create team form
    await page.goto("/teams/create");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/teams\/create/);

    // Fill out the form using data-testid selectors
    await page.locator("[data-testid='create-team-title']").fill("E2E Test Team");

    // Select a location from the dropdown
    const locationSelect = page.locator("[data-testid='create-team-location']");
    await expect(locationSelect).toBeVisible();
    // Pick the first non-empty option
    const options = await locationSelect.locator("option").allTextContents();
    const firstRealOption = options.find((text) => text.trim() !== "");
    if (firstRealOption) {
      await locationSelect.selectOption({ label: firstRealOption });
    }

    await page.locator("[data-testid='create-team-date']").fill("2026-12-31");
    await page.locator("[data-testid='create-team-time']").fill("10:00");
    await page.locator("[data-testid='create-team-max-members']").fill("5");
    await page.locator("[data-testid='create-team-description']").fill("Created by E2E test");

    // Submit and wait for navigation to the new team detail page
    await page.locator("[data-testid='create-team-submit']").click();
    await page.waitForURL(/\/teams\/.+/, { timeout: 5000 });

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });

  test("team detail page loads", async ({ page }) => {
    await page.goto("/teams/1");
    await page.waitForLoadState("domcontentloaded");
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
