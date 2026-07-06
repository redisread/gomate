import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

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
    await loginAsAdmin(page);
    await page.goto("/profile");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
  });
});
