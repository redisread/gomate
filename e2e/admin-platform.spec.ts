import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { signUpUser, getFirstLocationId, type FixtureUser } from "./fixtures";
import { fillLoginForm } from "./helpers";

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";
const LOCAL_ORIGIN = "http://localhost:5432";

let admin: FixtureUser;
let regularUser: FixtureUser;
let locationId: string;

function promoteLocalAdmin(userId: string) {
  try {
    execFileSync(
      process.execPath,
      [path.join(process.cwd(), "scripts/promote-admin.mjs"), "--user-id", userId],
      { cwd: process.cwd(), env: process.env, stdio: "pipe" },
    );
  } catch {
    throw new Error("Local E2E administrator promotion failed");
  }
}

async function authenticate(page: Page, user: FixtureUser) {
  const separator = user.cookie.indexOf("=");
  if (separator < 1) throw new Error("Local E2E session cookie is invalid");
  await page.context().addCookies([
    {
      name: user.cookie.slice(0, separator),
      value: user.cookie.slice(separator + 1),
      url: LOCAL_ORIGIN,
    },
    { name: "gomate_locale", value: "zh-CN", url: LOCAL_ORIGIN },
  ]);
}

async function useChineseLocale(page: Page) {
  await page.context().addCookies([
    { name: "gomate_locale", value: "zh-CN", url: LOCAL_ORIGIN },
  ]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe("admin platform", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async ({ browserName }, workerInfo) => {
    if (browserName !== "chromium") {
      throw new Error("Admin platform E2E requires Chromium");
    }
    const baseURL = String(workerInfo.project.use.baseURL ?? LOCAL_ORIGIN);
    const hostname = new URL(baseURL).hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      throw new Error("Admin platform E2E is restricted to localhost");
    }

    admin = await signUpUser(
      `admin-platform-${RUN_ID}@gmail.com`,
      PASSWORD,
      `Admin Platform ${RUN_ID}`,
    );
    regularUser = await signUpUser(
      `admin-regular-${RUN_ID}@gmail.com`,
      PASSWORD,
      `Regular User ${RUN_ID}`,
    );
    promoteLocalAdmin(admin.userId);
    locationId = await getFirstLocationId();
  });

  test("guest login returns to the requested protected admin page", async ({
    page,
  }) => {
    await useChineseLocale(page);
    await page.goto("/admin/locations/new?source=e2e");
    await expect(page).toHaveURL(
      /\/login\?returnTo=%2Fadmin%2Flocations%2Fnew%3Fsource%3De2e$/u,
    );

    await fillLoginForm(page, admin.email, admin.password);
    await page.getByTestId("login-submit").click();

    await page.waitForURL("**/admin/locations/new?source=e2e");
    await expect(
      page.getByRole("navigation", { name: "后台导航" }).first(),
    ).toBeVisible();
  });

  test("regular users receive 403 before admin content renders", async ({
    page,
  }) => {
    await authenticate(page, regularUser);

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(403);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("navigation", { name: "后台导航" })).toHaveCount(
      0,
    );

    const localizedResponse = await page.goto("/en/admin/locations/new");
    expect(localizedResponse?.status()).toBe(403);
    await expect(page.getByText("Admin access unavailable")).toBeVisible();
  });

  test("admin shell and location pages use one live navigation at desktop widths", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await authenticate(page, admin);

    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("aside")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新增地点" }).first(),
    ).toHaveAttribute("href", "/admin/locations/new");
    await expectNoHorizontalOverflow(page);

    await page.goto("/admin/locations/new");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("aside")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "GoMate", exact: true })).toHaveCount(
      0,
    );

    await page.goto(`/admin/locations/${locationId}/edit`);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("aside")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);

    await page.goto("/ja/admin");
    await expect(page.getByRole("heading", { level: 1, name: "管理画面" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test("location editor keeps draft navigation inside admin and exposes explicit publish controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await authenticate(page, admin);

    const sourceResponse = await page.request.get(`/api/locations/${locationId}/admin`);
    expect(sourceResponse.ok()).toBe(true);
    const source = (await sourceResponse.json()) as {
      location: { regionId: string };
    };
    const draftResponse = await page.request.post("/api/locations", {
      headers: { Origin: LOCAL_ORIGIN },
      data: {
        name: `E2E 发布流程 ${RUN_ID}`,
        description: "验证草稿发布操作和后台返回路径。",
        regionId: source.location.regionId,
        status: "draft",
      },
    });
    const draft = (await draftResponse.json()) as {
      location: { id: string };
    };
    expect(draftResponse.ok(), JSON.stringify(draft)).toBe(true);

    await page.goto(`/admin/locations/${draft.location.id}/edit`);
    await expect(page.getByRole("link", { name: "返回", exact: true })).toHaveAttribute(
      "href",
      "/admin/locations",
    );
    await expect(page.getByRole("link", { name: "查看公开页" })).toHaveCount(0);

    const actions = page.getByRole("region", { name: "地点保存与发布操作" });
    await expect(actions.getByRole("status")).toHaveText("草稿");
    await expect(actions.getByRole("button", { name: "保存草稿" })).toBeDisabled();
    await actions.getByRole("button", { name: "发布地点" }).click();

    const coverField = page.locator("#location-field-coverImageUrl");
    await expect(coverField.getByText("请上传封面图片")).toBeVisible();
    await expect(page.getByText("纬度范围为 -90 到 90")).toBeVisible();
    await expect(page.getByText("经度范围为 -180 到 180")).toBeVisible();
    await expect.poll(() => coverField.evaluate((element) =>
      element.contains(document.activeElement),
    )).toBe(true);

    await page.goto(`/admin/locations/${locationId}/edit`);
    await expect(page.getByRole("link", { name: "查看公开页" })).toHaveAttribute(
      "href",
      `/locations/${locationId}`,
    );

    await page.setViewportSize({ width: 320, height: 720 });
    await expect(actions).toBeVisible();
    const box = await actions.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeCloseTo(720, 0);
    await expectNoHorizontalOverflow(page);
  });

  test("mobile admin navigation survives dark mode, reduced motion and 200% scale", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await authenticate(page, admin);
    await page.goto("/ja/admin");

    const trigger = page.getByRole("button", {
      name: "管理ナビゲーションを開く",
    });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "管理ナビゲーション" });
    await expect(drawer).toBeVisible();
    await expect(
      page.getByRole("button", { name: "管理ナビゲーションを閉じる" }),
    ).toBeFocused();
    await expect(page.locator("body > [inert]")).not.toHaveCount(0);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");

    const drawerLinks = drawer.getByRole("link");
    const firstDrawerLink = drawerLinks.first();
    const lastDrawerLink = drawerLinks.last();
    await lastDrawerLink.focus();
    await page.keyboard.press("Tab");
    await expect(firstDrawerLink).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(lastDrawerLink).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.locator("body > [inert]")).toHaveCount(0);
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
    await expectNoHorizontalOverflow(page);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await expect(
      page.getByRole("link", { name: "スポットを追加" }).last(),
    ).toBeVisible();
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  });

  test("public navbar saves a quick location draft without loading the full editor", async ({
    page,
  }) => {
    const scriptUrls = new Set<string>();
    page.on("response", (response) => {
      if (response.request().resourceType() === "script") {
        scriptUrls.add(response.url());
      }
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await authenticate(page, admin);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const onboarding = page.getByTestId("onboarding-modal");
    if (await onboarding.isVisible()) {
      await page.keyboard.press("Escape");
      await expect(onboarding).toHaveCount(0);
    }

    await expect(page.getByTestId("nav-admin")).toHaveAttribute("href", "/admin");
    expect(
      [...scriptUrls].some((url) =>
        /location-edit|lazy-location/u.test(url),
      ),
    ).toBe(false);

    const trigger = page.getByRole("button", { name: "快速添加地点" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "快速记录地点" });
    await expect(dialog).toBeVisible();
    const nameInput = dialog.getByLabel("地点名称");
    await expect(nameInput).toBeFocused();
    const desktopBox = await dialog.boundingBox();
    expect(desktopBox).not.toBeNull();
    expect(desktopBox!.width).toBeLessThan(700);
    expect(desktopBox!.y).toBeGreaterThan(0);
    await nameInput.fill(`E2E 灵感地点 ${RUN_ID}`);
    await dialog.getByLabel("地点介绍").fill("快速记下，稍后继续完善。");
    const region = dialog.getByLabel("地区");
    await expect(region.locator("option")).not.toHaveCount(1);
    await region.selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "保存为草稿" }).click();
    await expect(dialog.getByText("灵感已保存为草稿。")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "继续完善全部字段" }))
      .toHaveAttribute("href", /\/admin\/locations\/[^/]+\/edit/u);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();

    await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const mobileTrigger = page.getByRole("button", { name: "快速添加地点" });
    await mobileTrigger.click();
    await expect(dialog).toBeVisible();
    const mobileBox = await dialog.boundingBox();
    expect(mobileBox).not.toBeNull();
    expect(mobileBox!.width).toBeCloseTo(320, 0);
    expect(mobileBox!.y + mobileBox!.height).toBeCloseTo(720, 0);
    const reducedDuration = await dialog.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
    expect(reducedDuration).toBeLessThanOrEqual(0.001);
    await expectNoHorizontalOverflow(page);
  });
});
