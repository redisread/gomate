import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import { patchWechat, signUpUser } from "./fixtures";

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";

test.describe("Team Flow", () => {
  test("create team requires login", async ({ page }) => {
    await page.goto("/teams/create");
    // Wait patiently for the auth redirect to complete (i18n routing may add locale prefix)
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("create team flow", async ({ page }) => {
    const user = await signUpUser(
      `team-create-${RUN_ID}@e2e.gomate.test`,
      PASSWORD,
      `Team creator ${RUN_ID}`,
    );
    await patchWechat(user, `e2e${RUN_ID}`);
    await loginAs(page, user.email, user.password);

    // Navigate to create team form
    await page.goto("/teams/create");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/teams\/create/);

    // Fill out the form using data-testid selectors
    await page.locator("[data-testid='create-team-title']").fill("E2E Test Team");

    // Select a location from the dropdown
    const locationSelect = page.locator("[data-testid='create-team-location']");
    await expect(locationSelect).toBeVisible();
    // Index 0 is the non-empty placeholder; choose the first real location.
    await expect(locationSelect.locator("option")).toHaveCount(2);
    await locationSelect.selectOption({ index: 1 });
    await page
      .locator("[data-testid='create-team-activity-type']")
      .selectOption("hiking");

    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() + 7);
    await page
      .locator("[data-testid='create-team-date']")
      .fill(startDate.toISOString().slice(0, 10));
    await page.locator("[data-testid='create-team-time']").fill("10:00");
    await page.locator("[data-testid='create-team-max-members']").fill("5");
    await page.locator("[data-testid='create-team-description']").fill("Created by E2E test");

    // Submit and wait for navigation to the new team detail page
    await page.locator("[data-testid='create-team-submit']").click();
    await page.waitForURL(/\/teams\/(?!create(?:\/|$))[^/]+/u, {
      timeout: 10_000,
    });

    await expect(
      page.getByText("E2E Test Team", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});
