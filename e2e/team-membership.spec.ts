import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import {
  signUpUser,
  patchWechat,
  createTeamAs,
  getFirstLocationId,
} from "./fixtures";

for (const locale of ["zh-CN", "en"]) {
  test(`direct membership in ${locale}`, async ({ page }) => {
    const run = `${Date.now()}-${locale}`;
    const leader = await signUpUser(
      `leader-${run}@e2e.gomate.test`,
      "test1234",
      "Leader",
    );
    await patchWechat(leader, "team-contact");
    const member = await signUpUser(
      `member-${run}@e2e.gomate.test`,
      "test1234",
      "Member",
    );
    const start = Date.now() + 7 * 86400000;
    const teamId = await createTeamAs(leader, {
      locationId: await getFirstLocationId(),
      activityType: "hiking",
      title: `Direct join ${run}`,
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 3600000).toISOString(),
      maxParticipants: 2,
      description: "A simple meeting",
      requirements: [],
      tagIds: [],
    });
    await page.context().addCookies([
      {
        name: "gomate_locale",
        value: locale,
        url: process.env.E2E_BASE_URL || "http://localhost:5432",
      },
    ]);
    await loginAs(page, member.email, member.password);
    await page.goto(`/teams/${teamId}`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.locator('[data-testid="team-join-button"]:visible').click();
    await expect(page.getByTestId("team-member-status")).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("team-member-status")).toBeVisible();
    await expect(page.getByTestId("team-applications-section")).toHaveCount(0);
    await page.getByTestId("team-member-status").getByRole("button").click();
    await page.getByRole("alertdialog").getByRole("button").first().click();
    await expect(page.getByTestId("team-member-status")).toHaveCount(0);
    await page.locator('[data-testid="team-join-button"]:visible').click();
    await expect(page.getByTestId("team-member-status")).toBeVisible();
    await page.context().clearCookies();
    await loginAs(page, leader.email, leader.password);
    await page.goto(`/teams/${teamId}`);
    await page
      .getByRole("button", { name: /移除 Member|Remove Member/ })
      .click();
    await expect(
      page.getByRole("button", { name: /移除 Member|Remove Member/ }),
    ).toHaveCount(0);
  });
}
