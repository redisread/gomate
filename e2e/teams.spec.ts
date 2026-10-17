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

  test("create and edit team flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));
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
    await page
      .locator("[data-testid='create-team-title']")
      .fill("E2E Test Team");

    // Search and select a public location by name.
    const locationPicker = page.locator("[data-testid='create-team-location']");
    await expect(locationPicker).toBeVisible();
    await locationPicker.click();
    await page
      .locator("[data-testid='create-team-location-search']")
      .fill("梧桐山");
    await page
      .getByRole("option", { name: /梧桐山/u })
      .first()
      .click();
    await expect(locationPicker).toContainText("梧桐山");
    await page
      .locator("[data-testid='create-team-activity-type']")
      .selectOption("explore");

    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() + 7);
    await page
      .locator("[data-testid='create-team-date']")
      .fill(startDate.toISOString().slice(0, 10));
    await expect(
      page.getByText(/活动开始时间|Activity Start Time/u, {
        exact: true,
      }),
    ).toBeVisible();
    await page.locator("[data-testid='create-team-time']").fill("10:00");
    await page.locator("[data-testid='create-team-max-members']").fill("5");
    await page
      .locator("[data-testid='create-team-description']")
      .fill("Created by E2E test");

    // Submit and wait for navigation to the new team detail page
    await page.locator("[data-testid='create-team-submit']").click();
    await page.waitForURL(/\/teams\/(?!create(?:\/|$))[^/]+/u, {
      timeout: 10_000,
    });

    await expect(
      page.getByText("E2E Test Team", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.locator("text=Internal Server Error")).not.toBeVisible();
    const teamId = new URL(page.url()).pathname.split("/").at(-1);
    const response = await page.request.get("/api/teams/" + teamId);
    expect(response.ok()).toBe(true);
    const { team } = await response.json();
    expect(team.location.coverImageUrl).toBeTruthy();
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      new URL(team.location.coverImageUrl, page.url()).href,
    );
    await page.goto(`/teams/${teamId}/edit`);
    const editTitle = page.locator('input[name="title"]');
    await expect(editTitle).toHaveValue("E2E Test Team");
    await expect(editTitle).toHaveAccessibleName(/.+/u);
    await expect(page.locator('input[name="startDateInput"]')).toHaveCount(0);
    await expect(page.locator('[name="locationId"]')).toHaveCount(0);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(editTitle).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await editTitle.focus();
    await page.keyboard.press("Tab");
    await expect(
      page.locator(`form a[href="/locations/${team.locationId}"]`),
    ).toBeFocused();
    await editTitle.fill("E2E Edited Team");
    await page.locator('[name="activityType"]').selectOption("travel");
    await page.locator('[name="durationMinutes"]').selectOption("180");
    await page.locator('[name="meetingPoint"]').fill("  Main entrance  ");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(`/teams/${teamId}`);
    const edited = await (
      await page.request.get(`/api/teams/${teamId}`)
    ).json();
    expect(edited.team.title).toBe("E2E Edited Team");
    expect(edited.team.activityType).toBe("travel");
    expect(edited.team.meetingPoint).toBe("Main entrance");
    expect(edited.team.locationId).toBe(team.locationId);
    expect(edited.team.startAt).toBe(team.startAt);
    expect(
      Date.parse(edited.team.endAt) - Date.parse(edited.team.startAt),
    ).toBe(180 * 60_000);
    expect(browserErrors).toEqual([]);
  });
});
