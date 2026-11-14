import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers";
import { createTeamAs, getFirstLocationId, patchWechat, signUpUser } from "./fixtures";

for (const locale of ["zh-CN", "en"]) {
  test(`${locale} replays a committed creation after response loss and tab reload`, async ({ page }) => {
    const user = await signUpUser(`replay-${locale}-${Date.now()}@e2e.gomate.test`, "test1234", "Replay tester");
    await patchWechat(user, "replay-contact");
    const locationId = await getFirstLocationId();
    await page.context().addCookies([{ name: "gomate_locale", value: locale, url: process.env.E2E_BASE_URL || "http://localhost:5432" }]);
    await loginAs(page, user.email, user.password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/teams/create?locationId=${locationId}`);
    await expect(page.getByTestId("create-team-activity-type")).toBeEnabled();
    await page.getByTestId("create-team-title").fill("One committed creation");
    await page.getByTestId("create-team-activity-type").selectOption("hiking");
    await page.getByTestId("create-team-date").fill("2099-08-16");
    await page.getByTestId("create-team-time").fill("09:30");
    await page.getByTestId("create-team-max-members").fill("6");
    await page.getByTestId("create-team-description").fill("Response-loss recovery");
    const payloads: string[] = [];
    let createdId = "";
    await page.route("**/api/teams", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      payloads.push(route.request().postData()!);
      if (payloads.length > 1) return route.continue();
      const committed = await route.fetch();
      expect(committed.status()).toBe(201);
      createdId = (await committed.json()).team.id;
      await route.abort("failed");
    });
    await page.getByTestId("create-team-submit").focus();
    await page.keyboard.press("Enter");
    const retry = page.getByRole("button", { name: /重试这次创建|Retry this creation/u });
    await expect(retry).toBeEnabled();
    await expect(page.getByTestId("create-team-title")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /查看我的队伍|Check My teams/u })).toHaveAttribute("href", "/my-teams");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload();
    await expect(retry).toBeEnabled();
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/teams/${createdId}$`));
    expect(payloads).toHaveLength(2);
    expect(payloads[1]).toBe(payloads[0]);
    expect(await page.evaluate((id) => sessionStorage.getItem(`gomate.team-create.${encodeURIComponent(id)}`), user.userId)).toBeNull();
  });
}

test("stale edits retain input until latest-version replacement is confirmed", async ({ page }) => {
  const user = await signUpUser(`conflict-${Date.now()}@e2e.gomate.test`, "test1234", "Conflict tester");
  await patchWechat(user, "conflict-contact");
  const locationId = await getFirstLocationId();
  const start = Date.now() + 7 * 86400000;
  const id = await createTeamAs(user, {
    locationId, activityType: "hiking", title: "Original title",
    startAt: new Date(start).toISOString(), endAt: new Date(start + 3600000).toISOString(), maxParticipants: 6,
  });
  await loginAs(page, user.email, user.password);
  await page.goto(`/teams/${id}/edit`);
  const title = page.locator('[name="title"]');
  await expect(title).toHaveValue("Original title");
  const current = await (await page.request.get(`/api/teams/${id}`)).json();
  const changed = await page.request.put(`/api/teams/${id}`, {
    headers: { Origin: new URL(page.url()).origin },
    data: { title: "Changed elsewhere", expectedVersion: current.team.version },
  });
  expect(changed.status()).toBe(200);
  await title.fill("My unsaved title");
  const save = page.getByRole("button", { name: /保存修改|Save Changes/u });
  await save.focus();
  await page.keyboard.press("Enter");
  const latest = page.getByRole("button", { name: /读取最新队伍信息|Load latest team details/u });
  await expect(latest).toBeVisible();
  await expect(title).toHaveValue("My unsaved title");
  await expect(save).toBeDisabled();
  page.once("dialog", (dialog) => dialog.dismiss());
  await latest.click();
  await expect(title).toHaveValue("My unsaved title");
  page.once("dialog", (dialog) => dialog.accept());
  await latest.click();
  await expect(title).toHaveValue("Changed elsewhere");
  await title.fill("Reviewed latest title");
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/teams/${id}$`));
  const final = await (await page.request.get(`/api/teams/${id}`)).json();
  expect(final.team.title).toBe("Reviewed latest title");
  expect(final.team.version).toBeGreaterThan(current.team.version);
});

test("manual reconciliation requires confirmation before releasing the stored operation", async ({ page }) => {
  const user = await signUpUser(`reconcile-${Date.now()}@e2e.gomate.test`, "test1234", "Reconcile tester");
  await patchWechat(user, "reconcile-contact");
  const locationId = await getFirstLocationId();
  await loginAs(page, user.email, user.password);
  const operation = {
    requestId: crypto.randomUUID(), locationId, title: "Unconfirmed creation",
    activityType: "hiking", maxParticipants: 6,
    startAt: "2099-08-16T09:00:00+08:00", endAt: "2099-08-16T13:00:00+08:00",
  };
  const raw = JSON.stringify(operation);
  await page.evaluate(({ userId, raw }) => {
    sessionStorage.setItem(`gomate.team-create.${encodeURIComponent(userId)}`, raw);
  }, { userId: user.userId, raw });
  await page.goto("/teams/create");
  const discard = page.getByRole("button", { name: /已核对我的队伍，放弃本次请求|I checked My teams/u });
  await expect(discard).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await discard.click();
  expect(await page.evaluate((id) => sessionStorage.getItem(`gomate.team-create.${encodeURIComponent(id)}`), user.userId)).toBe(raw);
  await expect(page.getByTestId("create-team-title")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await discard.click();
  await expect(page.getByTestId("create-team-title")).toBeVisible();
  expect(await page.evaluate((id) => sessionStorage.getItem(`gomate.team-create.${encodeURIComponent(id)}`), user.userId)).toBeNull();
});

test("successful logout in another tab clears a pending creation and its private snapshot", async ({ page, context }) => {
  const user = await signUpUser(`logout-tabs-${Date.now()}@e2e.gomate.test`, "test1234", "Logout tabs tester");
  await patchWechat(user, "private-contact");
  const locationId = await getFirstLocationId();
  await loginAs(page, user.email, user.password);
  await page.goto(`/teams/create?locationId=${locationId}`);
  await expect(page.getByTestId("create-team-activity-type")).toBeEnabled();
  await page.getByTestId("create-team-title").fill("Private pending team");
  await page.getByTestId("create-team-activity-type").selectOption("hiking");
  await page.getByTestId("create-team-date").fill("2099-08-16");
  await page.getByTestId("create-team-time").fill("09:30");
  await page.getByTestId("create-team-max-members").fill("6");
  await page.getByTestId("create-team-description").fill("Private pending description");
  await page.route("**/api/teams", async (route) => route.request().method() === "POST"
    ? route.fulfill({ status: 503, contentType: "application/json", body: '{"success":false}' })
    : route.continue());
  await page.getByTestId("create-team-submit").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: /重试这次创建|Retry this creation/u })).toBeEnabled();
  const other = await context.newPage();
  await other.goto("/my-teams");
  await other.getByRole("button", { name: /Logout tabs tester/ }).click();
  await other.getByRole("menuitem", { name: /退出登录|Log out|Logout|Sign out/u }).click();
  await expect(other).toHaveURL(new RegExp("/$"));
  await expect(page.getByText("Private pending team", { exact: true })).toHaveCount(0);
  expect(await page.evaluate((id) => sessionStorage.getItem(`gomate.team-create.${encodeURIComponent(id)}`), user.userId)).toBeNull();
  await loginAs(other, user.email, user.password);
  await page.goto("/teams/create");
  await expect(page.getByTestId("create-team-title")).toHaveValue("");
  await expect(page.getByRole("button", { name: /重试这次创建|Retry this creation/u })).toHaveCount(0);
  await other.close();
});
