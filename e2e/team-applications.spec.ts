import { test, expect } from "@playwright/test";
import { loginAs, gotoTeamByTitle } from "./helpers";

const EXPERT = { email: "expert@test.com", password: "test1234" };
const ADMIN = { email: "admin@test.com", password: "test1234" };
const LEADER_A = { email: "leader_a@test.com", password: "test1234" };
const LEADER_B = { email: "leader_b@test.com", password: "test1234" };

const TEAM_1_TITLE = "周末清水湾海岸线徒步";
const TEAM_2_TITLE = "梧桐山轻松线体验";
const EXPERT_NICKNAME = "Expert Hiker";
const ADMIN_NICKNAME = "Admin";

test.describe("Team Application Flow", () => {
  test("member can apply to join a recruiting team", async ({ page }) => {
    // expert 不是队伍 1 的成员，可以提交加入申请
    await loginAs(page, EXPERT.email, EXPERT.password);
    await gotoTeamByTitle(page, TEAM_1_TITLE);

    await page.locator("[data-testid='team-join-button']").click();
    await expect(page.locator("[data-testid='team-join-message']")).toBeVisible();
    await page.locator("[data-testid='team-join-message']").fill("我想参加这次徒步");
    await page.locator("[data-testid='team-join-submit']").click();

    // 申请提交后应显示“等待审核”状态
    await expect(page.locator("[data-testid='team-pending-status']")).toBeVisible();
  });

  test("leader can approve a pending application", async ({ page }) => {
    await loginAs(page, LEADER_A.email, LEADER_A.password);
    await gotoTeamByTitle(page, TEAM_1_TITLE);

    const applicationsSection = page.locator("[data-testid='team-applications-section']");
    await expect(applicationsSection).toBeVisible();

    // 找到 expert 的申请卡片并点击通过
    const appCard = applicationsSection
      .locator("[data-testid='team-application-card']")
      .filter({ hasText: EXPERT_NICKNAME });
    await appCard.locator("[data-testid='team-application-approve']").click();

    // 审批后该申请卡片应消失
    await expect(appCard).toHaveCount(0);
  });

  test("leader can reject a pending application", async ({ page }) => {
    await loginAs(page, LEADER_B.email, LEADER_B.password);
    await gotoTeamByTitle(page, TEAM_2_TITLE);

    const applicationsSection = page.locator("[data-testid='team-applications-section']");
    await expect(applicationsSection).toBeVisible();

    // 种子数据中 admin 在队伍 2 有一条待审核申请，找到后点击拒绝
    const appCard = applicationsSection
      .locator("[data-testid='team-application-card']")
      .filter({ hasText: ADMIN_NICKNAME });
    await appCard.locator("[data-testid='team-application-reject']").click();

    // 拒绝后该申请卡片应消失
    await expect(appCard).toHaveCount(0);
  });
});
