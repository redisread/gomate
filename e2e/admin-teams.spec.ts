import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  createTeamAs,
  getFirstLocationId,
  patchWechat,
  signUpUser,
  type FixtureUser,
} from "./fixtures";

const origin = process.env.E2E_ORIGIN || "http://localhost:5432";
const runId = Date.now().toString(36);
const prefix = `后台队伍 ${runId}`;
let admin: FixtureUser;
let leader: FixtureUser;
let completedId: string;
let ongoingId: string;
let closedId: string;

async function authenticate(page: Page, user: FixtureUser) {
  const separator = user.cookie.indexOf("=");
  await page.context().addCookies([
    {
      name: user.cookie.slice(0, separator),
      value: user.cookie.slice(separator + 1),
      url: origin,
    },
    { name: "gomate_locale", value: "zh-CN", url: origin },
  ]);
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

test.describe("read-only administrator teams", () => {
  test.beforeAll(async ({ browserName }, workerInfo) => {
    if (browserName !== "chromium") throw new Error("Team E2E requires Chromium");
    if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
      throw new Error("Team fixtures require localhost");
    const fixtureOrigin = new URL(origin).origin;
    const apiOrigin = new URL(process.env.E2E_API_URL || `${origin}/api`)
      .origin;
    const browserOrigin = new URL(
      String(workerInfo.project.use.baseURL || origin),
    ).origin;
    if (apiOrigin !== fixtureOrigin || browserOrigin !== fixtureOrigin)
      throw new Error(
        "Team fixtures require the same local page and API origin",
      );
    admin = await signUpUser(
      `team-admin-${runId}@gmail.com`,
      "test1234",
      `队伍管理员 ${runId}`,
    );
    leader = await signUpUser(
      `team-leader-${runId}@gmail.com`,
      "test1234",
      `队伍领队 ${runId}`,
    );
    execFileSync(
      process.execPath,
      ["scripts/promote-admin.mjs", "--user-id", admin.userId],
      { stdio: "pipe" },
    );
    await patchWechat(leader, "local-test-contact");
    const locationId = await getFirstLocationId();
    const now = Date.now();
    const create = (title: string) =>
      createTeamAs(leader, {
        locationId,
        activityType: "hiking",
        title,
        description: "后台只读详情的活动说明",
        startAt: new Date(now + 86400000).toISOString(),
        endAt: new Date(now + 90000000).toISOString(),
        maxParticipants: 9,
        requirements: ["带足饮用水"],
      });
    completedId = await create(`${prefix} 已完成`);
    ongoingId = await create(`${prefix} 进行中`);
    closedId = await create(`${prefix} 已关闭`);
    const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
    const directory = mkdtempSync(path.join(tmpdir(), "gomate-admin-teams-"));
    const sqlFile = path.join(directory, "fixtures.sql");
    try {
      writeFileSync(
        sqlFile,
        `
        UPDATE teams SET start_at=${now - 7200000}, end_at=${now - 3600000}, formed_at=${now - 10800000},
          recruitment_status='closed', checklist='{"notes":"队伍集合说明"}' WHERE id=${quote(completedId)};
        UPDATE teams SET start_at=${now - 3600000}, end_at=${now + 3600000}, formed_at=${now - 7200000}
          WHERE id=${quote(ongoingId)};
        UPDATE teams SET recruitment_status='closed' WHERE id=${quote(closedId)};
        INSERT INTO team_members (team_id, user_id, joined_at) VALUES (${quote(completedId)}, ${quote(admin.userId)}, ${now});
      `,
      );
      execFileSync(
        path.join(process.cwd(), "node_modules/.bin/wrangler"),
        [
          "d1",
          "execute",
          "DB",
          "--local",
          "--config",
          "wrangler.jsonc",
          "--persist-to",
          process.env.GOMATE_LOCAL_STATE ||
            path.join(homedir(), ".gomate/wrangler-state"),
          "--file",
          sqlFile,
        ],
        { stdio: "pipe" },
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  test("guards both the page and read APIs", async ({ page }) => {
    await page.goto("/admin/teams");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fadmin%2Fteams/u);
    expect((await page.request.get("/api/admin/teams")).status()).toBe(401);
    expect(
      (await page.request.get(`/api/admin/teams/${completedId}`)).status(),
    ).toBe(401);
    await authenticate(page, leader);
    expect((await page.goto("/admin/teams"))?.status()).toBe(403);
    expect((await page.request.get("/api/admin/teams")).status()).toBe(403);
    expect(
      (await page.request.get(`/api/admin/teams/${completedId}`)).status(),
    ).toBe(403);
  });

  test("searches all statuses, intersects filters and preserves them on reload", async ({
    page,
  }) => {
    await authenticate(page, admin);
    await page.goto(`/admin/teams?q=${encodeURIComponent(prefix)}`);
    const list = page.getByRole("list", { name: "队伍列表" });
    await expect(list.getByRole("listitem")).toHaveCount(3);
    await page
      .getByLabel("活动状态", { exact: true })
      .selectOption("completed");
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText(`${prefix} 已完成`);
    await page.getByLabel("招募状态", { exact: true }).selectOption("open");
    await expect(page.getByText("没有匹配的队伍")).toBeVisible();
    await page
      .getByLabel("活动状态", { exact: true })
      .selectOption("in_progress");
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText(`${prefix} 进行中`);
    await page.reload();
    await expect(page.getByLabel("活动状态", { exact: true })).toHaveValue(
      "in_progress",
    );
    await expect(list).toContainText(`${prefix} 进行中`);
    await page.getByLabel("活动状态", { exact: true }).selectOption("");
    await page.getByLabel("招募状态", { exact: true }).selectOption("closed");
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await page.getByLabel("检索队伍", { exact: true }).fill(leader.name);
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(list.getByRole("listitem")).toHaveCount(2);
    await page.getByLabel("检索队伍", { exact: true }).fill(completedId);
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(list.getByRole("listitem")).toHaveCount(1);
    await expect(list).toContainText(`${prefix} 已完成`);
  });

  test("views full details and members using only GET, traps focus and restores it", async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on("request", (request) => {
      if (
        request.url().includes("/api/") &&
        !["GET", "HEAD"].includes(request.method())
      )
        writes.push(request.method());
    });
    await authenticate(page, admin);
    await page.goto(`/admin/teams?q=${completedId}`);
    const trigger = page.getByRole("button", {
      name: `查看详情：${prefix} 已完成`,
    });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const detail = page.getByRole("dialog", { name: "队伍详情", exact: true });
    await expect(detail.getByText("后台只读详情的活动说明")).toBeVisible();
    await expect(detail.getByText("队伍集合说明")).toBeVisible();
    await expect(detail.getByText(admin.name, { exact: true })).toBeVisible();
    await expect(
      detail.getByText(leader.name, { exact: true }).first(),
    ).toBeVisible();
    await expect(detail.getByRole("button")).toHaveCount(1);
    const close = detail.getByRole("button", { name: "关闭队伍详情" });
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(writes).toEqual([]);
  });

  test("renders all locales at small and large widths with dark mode and reduced motion", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type()))
        errors.push(message.text());
    });
    await authenticate(page, admin);
    for (const [locale, title, search, view, dialog] of [
      [
        "zh-CN",
        "队伍管理",
        "检索队伍",
        `查看详情：${prefix} 已完成`,
        "队伍详情",
      ],
      [
        "en",
        "Teams",
        "Search teams",
        `View details: ${prefix} 已完成`,
        "Team details",
      ],
      [
        "ja",
        "チーム管理",
        "チーム検索",
        `詳細を見る：${prefix} 已完成`,
        "チーム詳細",
      ],
    ]) {
      for (const width of [320, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({
          colorScheme: "dark",
          reducedMotion: "reduce",
        });
        const route = `${locale === "zh-CN" ? "" : `/${locale}`}/admin/teams?q=${completedId}`;
        await page.goto(route);
        await expect(
          page.getByRole("heading", { level: 1, name: title, exact: true }),
        ).toBeVisible();
        await expect(page.getByRole("button", { name: view })).toBeVisible();
        await expect(page.getByLabel(search, { exact: true })).toHaveCSS(
          "font-size",
          "16px",
        );
        await expect(page.locator("body")).not.toContainText(
          /\b(?:admin|enums|teams)\.[a-zA-Z]/u,
        );
        await noOverflow(page);
        await page.getByRole("button", { name: view }).click();
        await expect(
          page
            .getByRole("dialog", { name: dialog, exact: true })
            .getByText("队伍集合说明"),
        ).toBeVisible();
        await noOverflow(page);
        if (locale === "zh-CN" && [320, 1440].includes(width))
          await page.screenshot({
            path: testInfo.outputPath(`team-detail-${width}.png`),
          });
        await page.keyboard.press("Escape");
      }
    }
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page
      .context()
      .addCookies([{ name: "gomate_locale", value: "zh-CN", url: origin }]);
    await page.goto(`/admin/teams?q=${encodeURIComponent(prefix)}`);
    await expect(
      page.getByRole("list", { name: "队伍列表" }).getByRole("listitem"),
    ).toHaveCount(3);
    await page.screenshot({
      path: testInfo.outputPath("team-list-desktop.png"),
    });
    expect(errors).toEqual([]);
  });
});
