import { test, expect } from "@playwright/test";
import {
  signUpUser,
  patchWechat,
  createTeamAs,
  getFirstLocationId,
} from "./fixtures";

test("a failed session lookup offers retry rather than treating the member as signed out", async ({
  page,
}) => {
  const leader = await signUpUser(
    `recovery-${Date.now()}@e2e.gomate.test`,
    "test1234",
    "Recovery leader",
  );
  await patchWechat(leader, "contact");
  const start = Date.now() + 86400000;
  const teamId = await createTeamAs(leader, {
    locationId: await getFirstLocationId(),
    activityType: "hiking",
    title: "Session recovery team",
    startAt: new Date(start).toISOString(),
    endAt: new Date(start + 3600000).toISOString(),
    maxParticipants: 4,
  });
  await page.route("**/api/users/me", (route) =>
    route.fulfill({ status: 500, json: { success: false } }),
  );
  await page.goto(`/zh-CN/teams/${teamId}`);
  await expect(
    page.getByText("无法加载您的状态", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "去登录", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Session recovery team" })).toBeVisible();
  await page.unroute("**/api/users/me");
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Session recovery team" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "去登录", exact: true }).first()).toBeVisible();
  await expect(page.getByText("无法加载您的状态", { exact: true })).toHaveCount(0);
});

test("feedback retry reuses the submission identity and editing creates a new one", async ({
  page,
}) => {
  const requests: Array<{ requestId: string; email: string; content: string }> =
    [];
  await page.route("**/api/feedback", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({
      status: requests.length === 1 ? 500 : 200,
      json: requests.length === 1 ? { success: false } : { success: true },
    });
  });
  await page.goto("/zh-CN/feedback");
  await expect(
    page.locator('astro-island[component-export="FeedbackClient"]'),
  ).not.toHaveAttribute("ssr", "");
  await page.locator("#feedback-email").fill("reply@example.test");
  await page
    .locator("#feedback-content")
    .fill("Please improve the meeting details");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("status")).toBeVisible();
  expect(requests[0].requestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(requests[1]).toEqual(requests[0]);
  await page.getByRole("button", { name: "继续提交" }).click();
  await page.locator("#feedback-content").fill("Another suggestion");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("status")).toBeVisible();
  expect(requests[2].requestId).not.toBe(requests[0].requestId);
});
