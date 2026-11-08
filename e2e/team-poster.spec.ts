import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";

const team = {
  id: "poster-team",
  title: "周末一起去山野，沿着湖边慢慢走",
  activityType: "hiking",
  description: "PRIVATE_DESCRIPTION",
  startAt: "2027-04-17T01:30:00Z",
  endAt: "2027-04-18T07:30:00Z",
  lifecycle: "pending",
  recruitmentStatus: "open",
  isFull: false,
  activeParticipantCount: 3,
  maxParticipants: 12,
  meetingPoint: "PRIVATE_MEETING_POINT",
  requirements: [],
  leader: {
    id: "leader",
    name: "PRIVATE_LEADER",
    extra: { wechat: "PRIVATE_CONTACT" },
  },
  location: {
    id: "location",
    name: "山间湖泊步道",
    coverImageUrl: "/images/footer-landscape-small.webp",
    region: { name: "深圳", timezone: "Asia/Shanghai" },
  },
  participants: [],
};

async function setup(page: Page, signedIn = true, overrides = {}) {
  await page.route("**/api/teams/poster-team", (route) =>
    route.fulfill({ json: { success: true, team: { ...team, ...overrides } } }),
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: {
        user: signedIn ? { id: "viewer", name: "Viewer", extra: {} } : null,
      },
    }),
  );
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({ json: null }),
  );
  await page.route("**/api/teams/poster-team/my-status", (route) =>
    route.fulfill({ json: { success: true, status: null } }),
  );
}

async function openPoster(page: Page, english = false) {
  await page
    .getByRole("button", {
      name: english ? "Share poster" : "分享海报",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  const image = dialog.getByRole("img");
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 1080);
  await expect(image).toHaveJSProperty("naturalHeight", 1440);
  return { dialog, image };
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
});

test("requires a fresh login and never generates an anonymous image", async ({
  page,
}) => {
  await setup(page, false);
  await page.goto("/teams/poster-team");
  await page.getByRole("button", { name: "分享海报", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("登录后即可生成队伍分享海报。")).toBeVisible();
  await expect(dialog.getByRole("img")).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "去登录" })).toHaveAttribute(
    "href",
    "/login?redirect=%2Fteams%2Fposter-team",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "分享海报", exact: true }),
  ).toBeFocused();
});

test("exports an exact PNG with a decodable team QR and public fields only", async ({
  page,
  baseURL,
}) => {
  await setup(page);
  await page.goto("/teams/poster-team");
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      const [value, x, y] = args;
      if (x === 64 && y >= 698 && y < 870) {
        const lines = JSON.parse(
          document.documentElement.dataset.posterTitleLines ?? "[]",
        );
        document.documentElement.dataset.posterTitleLines = JSON.stringify([
          ...lines,
          value,
        ]);
      }
      original.apply(this, args);
    };
  });
  const { dialog, image } = await openPoster(page);
  const titleLines: string[] = await page.evaluate(() =>
    JSON.parse(document.documentElement.dataset.posterTitleLines ?? "[]"),
  );
  expect(titleLines.length).toBeGreaterThan(1);
  expect(titleLines.every((line) => [...line].length > 1)).toBe(true);
  await expect(dialog.getByRole("status")).toHaveCount(0);
  await expect(dialog).not.toContainText("PRIVATE_");
  await expect(dialog).toContainText("最多 12 人");
  await expect(dialog).toContainText("2027/04/18 15:30");
  const pixels = await image.evaluate((element: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const context = canvas.getContext("2d")!;
    context.drawImage(element, 0, 0);
    return Array.from(context.getImageData(760, 1160, 280, 280).data);
  });
  expect(jsQR(new Uint8ClampedArray(pixels), 280, 280)?.data).toBe(
    `${baseURL}/teams/poster-team`,
  );
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "保存图片" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("gomate-team-poster-team.png");
  await download.saveAs(".wrangler/poster-shots/team-poster.png");
  await page.screenshot({ path: ".wrangler/poster-shots/desktop.png" });
});

test("keeps the light poster identical in dark mode and supports 320px with keyboard", async ({
  page,
  context,
  baseURL,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/teams/poster-team");
  const first = await openPoster(page);
  const light = await first.image.evaluate(async (img: HTMLImageElement) => {
    const blob = await (await fetch(img.src)).blob();
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
      ),
    );
  });
  await first.dialog
    .getByRole("button", { name: "关闭", exact: true })
    .press("Escape");
  await context.addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
  await page.reload();
  const { dialog, image } = await openPoster(page);
  const dark = await image.evaluate(async (img: HTMLImageElement) => {
    const blob = await (await fetch(img.src)).blob();
    return Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
      ),
    );
  });
  expect(dark).toEqual(light);
  await expect(dialog.getByRole("link", { name: "保存图片" })).toBeInViewport();
  await dialog.getByRole("link", { name: "保存图片" }).focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "关闭", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".wrangler/poster-shots/mobile-dark.png" });
});

test("falls back on failed photos and renders long English titles for cancelled teams", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "en", url: baseURL! },
  ]);
  await setup(page, true, {
    title:
      "A very long weekend adventure across the mountains with friends and a quiet afternoon beside the lake",
    lifecycle: "cancelled",
    location: { ...team.location, coverImageUrl: "/missing-poster-photo.png" },
  });
  await page.goto("/teams/poster-team");
  const { dialog } = await openPoster(page, true);
  await expect(dialog).toContainText("Cancelled");
  await expect(dialog.getByRole("status")).toHaveText(
    "The photo is unavailable. A location card is shown instead.",
  );
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "Save image" }).click();
  await (
    await downloadPromise
  ).saveAs(".wrangler/poster-shots/english-fallback.png");
});

test("recovers from a failed refresh and discards work after close", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/teams/poster-team");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(team.title);
  let fail = true;
  await page.route("**/api/teams/poster-team", (route) =>
    fail
      ? route.fulfill({ status: 503, json: { success: false } })
      : route.fulfill({ json: { success: true, team } }),
  );
  await page.getByRole("button", { name: "分享海报", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("alert")).toHaveText("海报生成失败，请重试。");
  fail = false;
  await dialog.getByRole("button", { name: "重试", exact: true }).click();
  await expect(dialog.getByRole("img")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/teams/poster-team", async (route) => {
    await gate;
    await route.fulfill({ json: { success: true, team } });
  });
  await page.getByRole("button", { name: "分享海报", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "正在生成海报…",
  );
  await page.keyboard.press("Escape");
  release();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.unroute("**/api/teams/poster-team");
  await page.route("**/api/teams/poster-team", (route) =>
    route.fulfill({
      json: { success: true, team: { ...team, lifecycle: "completed" } },
    }),
  );
  const reopened = await openPoster(page);
  await expect(reopened.dialog).toContainText("已结束");
});

test("bounds a stalled proxied photo and still exports a full long-title poster", async ({
  page,
}) => {
  const cover = "https://gomate.cos.jiahongw.com/poster-cover.webp";
  await setup(page, true, {
    title: "山海同行周末出发".repeat(12),
    isFull: true,
    location: { ...team.location, coverImageUrl: cover },
  });
  await page.route(cover, (route) => route.abort());
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let proxyRequested = false;
  await page.route("**/api/proxy-image?**", async (route) => {
    proxyRequested =
      new URL(route.request().url()).searchParams.get("url") === cover;
    await gate;
    await route.abort().catch(() => {});
  });
  await page.goto("/teams/poster-team");
  await page.getByRole("button", { name: "分享海报", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("img")).toBeVisible({ timeout: 15_000 });
  expect(proxyRequested).toBe(true);
  await expect(dialog).toContainText("已满员");
  await expect(dialog.getByRole("status")).toHaveText(
    "照片暂不可用，已生成地点文字卡。",
  );
  release();
  const download = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "保存图片" }).click();
  await (await download).saveAs(".wrangler/poster-shots/long-title.png");
});
