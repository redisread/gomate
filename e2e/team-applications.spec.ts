import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";
import {
  signUpUser,
  patchWechat,
  createTeamAs,
  applyToTeamAs,
  getFirstLocationId,
  type FixtureUser,
} from "./fixtures";

/**
 * 队伍申请流 E2E —— 每次运行自构造隔离 fixture。
 *
 * 历史版本依赖 seed 预置的 expert/admin/leader_a/leader_b@test.com + 特定队伍的
 * 特定 pending 申请：旧种子账号在 staging D1 已不存在（E2E 因此全红 18+ 次），
 * 且 approve/reject 消耗 pending 状态，预置种子天然不幂等。
 * 现改为每个用例自建 leader/member/team/application，UI 只走被测主路径。
 */

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";

async function makeUser(role: string): Promise<FixtureUser> {
  const user = await signUpUser(`e2e-app-${RUN_ID}-${role}@e2e.gomate.test`, PASSWORD, `E2E ${RUN_ID} ${role}`);
  // 建队 / 申请加入都强制要求已填微信号
  await patchWechat(user, `e2e${RUN_ID}${role}`);
  return user;
}

/** leader 建一支未来 7 天出发的招募中队，返回 teamId */
async function makeTeam(leader: FixtureUser, suffix: string): Promise<string> {
  const locationId = await getFirstLocationId();
  const start = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return createTeamAs(leader, {
    locationId,
    title: `E2E 申请流 ${RUN_ID} ${suffix}`,
    date: start.toISOString().split("T")[0]!,
    time: "10:00",
    maxMembers: 5,
    description: "E2E 自构造 fixture 队伍，可安全忽略",
  });
}

test.describe("Team Application Flow", () => {
  test("member can apply to join a recruiting team", async ({ page }) => {
    const leader = await makeUser("leader-apply");
    const teamId = await makeTeam(leader, "申请");
    const member = await makeUser("applicant-apply");

    await loginAs(page, member.email, member.password);
    await page.goto(`/teams/${teamId}`);

    await page.locator("[data-testid='team-join-button']").click();
    await expect(page.locator("[data-testid='team-join-message']")).toBeVisible();
    await page.locator("[data-testid='team-join-message']").fill("我想参加这次徒步");
    await page.locator("[data-testid='team-join-submit']").click();

    // 申请提交后应显示“等待审核”状态
    await expect(page.locator("[data-testid='team-pending-status']")).toBeVisible();
  });

  test("leader can approve a pending application", async ({ page }) => {
    const leader = await makeUser("leader-approve");
    const teamId = await makeTeam(leader, "审批");
    const member = await makeUser("applicant-approve");
    // pending 申请由 API 构造，UI 只走审批主路径
    await applyToTeamAs(member, teamId);

    await loginAs(page, leader.email, leader.password);
    await page.goto(`/teams/${teamId}`);

    const applicationsSection = page.locator("[data-testid='team-applications-section']");
    await expect(applicationsSection).toBeVisible();

    // 找到该成员的申请卡片并点击通过
    const appCard = applicationsSection
      .locator("[data-testid='team-application-card']")
      .filter({ hasText: member.name });
    await appCard.locator("[data-testid='team-application-approve']").click();

    // 审批后该申请卡片应消失
    await expect(appCard).toHaveCount(0);
  });

  test("leader can reject a pending application", async ({ page }) => {
    const leader = await makeUser("leader-reject");
    const teamId = await makeTeam(leader, "拒绝");
    const member = await makeUser("applicant-reject");
    await applyToTeamAs(member, teamId);

    await loginAs(page, leader.email, leader.password);
    await page.goto(`/teams/${teamId}`);

    const applicationsSection = page.locator("[data-testid='team-applications-section']");
    await expect(applicationsSection).toBeVisible();

    const appCard = applicationsSection
      .locator("[data-testid='team-application-card']")
      .filter({ hasText: member.name });
    await appCard.locator("[data-testid='team-application-reject']").click();

    // 拒绝后该申请卡片应消失
    await expect(appCard).toHaveCount(0);
  });
});
