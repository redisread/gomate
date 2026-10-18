import { execFileSync } from "node:child_process";
import path from "node:path";

import { expect, test, type Page, type Route } from "@playwright/test";

import { signUpUser, getFirstLocationId, type FixtureUser } from "./fixtures";
import { fillLoginForm } from "./helpers";

const RUN_ID = Date.now().toString(36);
const PASSWORD = "test1234";
const LOCAL_ORIGIN = process.env.E2E_ORIGIN || "http://localhost:5432";

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

    await page.goto("/en/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test("administrator shell and location terminology stay localized in all supported locales", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 900 });
    await authenticate(page, admin);

    const locales = [
      {
        pathPrefix: "",
        heading: "管理后台",
        navigation: "后台导航",
        language: "中文",
        locationsHref: "/admin/locations",
        activityLabel: "适合的活动类型",
      },
      {
        pathPrefix: "/en",
        heading: "Admin",
        navigation: "Admin navigation",
        language: "English",
        locationsHref: "/en/admin/locations",
        activityLabel: "Suitable activities",
      },
    ] as const;

    for (const locale of locales) {
      await page.goto(`${locale.pathPrefix}/admin`);
      await expect(
        page.getByRole("heading", { level: 1, name: locale.heading }),
      ).toBeVisible();
      const navigation = page
        .getByRole("navigation", { name: locale.navigation })
        .first();
      await expect(navigation).toBeVisible();
      await expect(
        navigation.getByRole("link", { name: /地点管理|Locations/u }),
      ).toHaveAttribute("href", locale.locationsHref);
      await expect(
        page.getByRole("button", { name: locale.language }).first(),
      ).toBeVisible();

      await page.goto(`${locale.pathPrefix}/admin/locations/new`);
      await expect(page.getByText(locale.activityLabel).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    expect(pageErrors).toEqual([]);
  });

  test("all administrator management page headings render translated text", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await authenticate(page, admin);

    const pages = [
      {
        path: "/admin/locations",
        heading: "地点管理",
        locale: "zh-CN",
      },
      {
        path: "/en/admin/locations",
        heading: "Locations",
        locale: "en",
      },
      {
        path: "/admin/tags",
        heading: "标签管理",
        locale: "zh-CN",
      },
      {
        path: "/en/admin/tags",
        heading: "Tags",
        locale: "en",
      },
      {
        path: "/admin/users",
        heading: "用户与管理员",
        locale: "zh-CN",
      },
      {
        path: "/en/admin/users",
        heading: "Users and administrators",
        locale: "en",
      },
    ] as const;

    for (const { path, heading, locale } of pages) {
      await page.context().addCookies([
        { name: "gomate_locale", value: locale, url: LOCAL_ORIGIN },
      ]);
      const response = await page.request.get(path);
      expect(response?.status()).toBe(200);
      const serverHtml = await response.text();
      const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
      expect(serverHtml).toMatch(
        new RegExp(`<h1\\b[^>]*>\\s*${escapedHeading}\\s*</h1>`, "u"),
      );
      expect(serverHtml).not.toMatch(
        /\b(?:admin|enums|ui|content|nav|common)\.[A-Za-z]/u,
      );

      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      await expect(page.locator("body")).not.toContainText(
        /\b(?:admin|enums|ui|content|nav|common)\.[A-Za-z]/u,
      );
    }
  });

  test("location sections expose headings, labels and keyboard disclosures across widths", async ({ page }, testInfo) => {
    await authenticate(page, admin);
    for (const width of [320, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: width === 320 ? "dark" : "light", reducedMotion: "reduce" });
      await page.goto(`/admin/locations/${locationId}/edit`);
      await expect(page.getByRole("heading", { name: "基本信息", level: 2 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "封面与季节", level: 2 })).toBeVisible();
      await expect(page.getByRole("button", { name: "基本信息", exact: true })).toHaveCount(0);
      await expect(page.getByLabel("名称 *", { exact: true })).toBeVisible();
      const settings = page.getByRole("button", { name: /高级设置/ });
      await settings.focus();
      await settings.press("Space");
      await expect(settings).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("button", { name: "配套设施", exact: true })).toHaveCount(0);
      await expect(settings).toBeFocused();
      await settings.press("Enter");
      const facilities = page.getByRole("button", { name: "配套设施", exact: true });
      await expect(facilities).toBeVisible();
      expect((await facilities.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect((await page.getByRole("button", { name: "关联标签", exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(facilities).toHaveAttribute("aria-expanded", "true");
      await facilities.focus();
      await facilities.press("Space");
      await expect(facilities).toHaveAttribute("aria-expanded", "false");
      await facilities.press("Enter");
      await expect(facilities).toHaveAttribute("aria-expanded", "true");
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`location-form-${width}.png`), fullPage: true });
    }
  });

  test("location gallery retains concurrent uploads in the controlled form", async ({ page }) => {
    await authenticate(page, admin);
    const uploads: Route[] = [];
    await page.route("**/api/upload/location", (route) => { uploads.push(route); });
    await page.goto(`/admin/locations/${locationId}/edit`);
    const input = page.locator('input[type="file"][multiple]');
    await input.setInputFiles([
      { name: "first.jpg", mimeType: "image/jpeg", buffer: Buffer.from("first") },
      { name: "second.jpg", mimeType: "image/jpeg", buffer: Buffer.from("second") },
    ]);
    await expect.poll(() => uploads.length).toBe(2);
    await uploads[1]!.fulfill({ json: { url: "/upload-queue-second.jpg" } });
    await uploads[0]!.fulfill({ json: { url: "/upload-queue-first.jpg" } });
    await expect(page.locator('img[src="/upload-queue-first.jpg"]')).toHaveCount(1);
    await expect(page.locator('img[src="/upload-queue-second.jpg"]')).toHaveCount(1);
  });

  for (const kind of ["cover", "gallery"]) {
    test(`discard ignores pending ${kind} uploads even when image values are unchanged`, async ({ page }) => {
      await authenticate(page, admin);
      const uploads: Route[] = [];
      await page.route("**/api/upload/location", (route) => { uploads.push(route); });
      await page.goto(`/admin/locations/${locationId}/edit`);
      const name = page.locator("#location-field-name input");
      const originalName = await name.inputValue();
      await name.fill(`${originalName} edited`);
      await page.locator(kind === "cover" ? 'input[type="file"]:not([multiple])' : 'input[type="file"][multiple]').setInputFiles({
        name: "pending.jpg", mimeType: "image/jpeg", buffer: Buffer.from("pending"),
      });
      await expect.poll(() => uploads.length).toBe(1);
      page.once("dialog", (dialog) => dialog.accept());
      const discard = page.getByRole("button", { name: "放弃更改", exact: true });
      await discard.click();
      await expect(name).toHaveValue(originalName);
      const completed = page.waitForResponse("**/api/upload/location");
      await uploads[0]!.fulfill({ json: { url: `/discarded-${kind}.jpg` } });
      await (await completed).finished();
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(page.locator(`img[src="/discarded-${kind}.jpg"]`)).toHaveCount(0);
      await expect(discard).not.toBeVisible();
    });
  }
  test("location editor saves even when browser draft storage is denied", async ({ page }) => {
    await authenticate(page, admin);
    const source = await (await page.request.get(`/api/locations/${locationId}/admin`)).json();
    const created = await page.request.post("/api/locations", {
      headers: { Origin: LOCAL_ORIGIN },
      data: { name: `Storage test ${RUN_ID}`, description: "Draft storage regression", regionId: source.location.regionId, status: "draft" },
    });
    expect(created.ok()).toBe(true);
    const { location: draft } = await created.json();
    await page.addInitScript(() => {
      for (const method of ["getItem", "setItem", "removeItem"] as const) {
        const original = Storage.prototype[method];
        Object.defineProperty(Storage.prototype, method, {
          configurable: true,
          value: function (key: string, value?: string) {
            if (key.startsWith("location-")) throw new DOMException("Denied", "SecurityError");
            return Reflect.apply(original, this, value === undefined ? [key] : [key, value]);
          },
        });
      }
    });
    await page.goto(`/admin/locations/${draft.id}/edit`);
    const name = page.locator("#location-field-name input");
    await expect(name).toHaveValue(`Storage test ${RUN_ID}`);
    await name.fill(`Storage saved ${RUN_ID}`);
    await page.getByRole("region", { name: "地点保存与发布操作" }).getByRole("button", { name: "保存草稿" }).click();
    await expect(page.getByText("保存成功", { exact: true })).toBeVisible();
    const persisted = await (await page.request.get(`/api/locations/${draft.id}/admin`)).json();
    expect(persisted.location.name).toBe(`Storage saved ${RUN_ID}`);
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
    await expect(page.getByText("坐标可选；如填写，请同时填写纬度和经度。可在高德地图/百度地图右键复制坐标")).toBeVisible();
    await expect(page.getByText("纬度和经度需要同时填写")).toHaveCount(0);
    await expect.poll(() => coverField.evaluate((element) =>
      element.contains(document.activeElement),
    )).toBe(true);

    await page.locator("#location-field-latitude").fill("22.5");
    await actions.getByRole("button", { name: "发布地点" }).click();
    await expect(page.getByText("纬度和经度需要同时填写")).toBeVisible();

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
    await page.goto("/en/admin");

    const trigger = page.getByRole("button", {
      name: "Open admin navigation",
    });
    await trigger.click();
    const drawer = page.getByRole("dialog", { name: "Admin navigation" });
    await expect(drawer).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Close admin navigation" }),
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
      page.getByRole("link", { name: "Add location" }).last(),
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

    await expect(page.getByTestId("nav-admin")).not.toBeVisible();
    const userMenu = page.locator("[data-user-menu] > button");
    await userMenu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("nav-admin")).toHaveAttribute(
      "href",
      "/admin",
    );
    await page.screenshot({ path: "test-results/personal-menu-desktop.png" });
    expect(
      [...scriptUrls].some((url) => /location-edit|lazy-location/u.test(url)),
    ).toBe(false);

    const trigger = page.getByRole("menuitem", { name: "快速添加地点" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "快速记录地点" });
    await expect(dialog).toBeVisible();
    const nameInput = dialog.getByLabel("地点名称");
    await expect(nameInput).toBeFocused();
    const desktopBox = await dialog.locator("[data-gomate-modal-panel]").boundingBox();
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
    await expect(
      dialog.getByRole("link", { name: "继续完善全部字段" }),
    ).toHaveAttribute("href", /\/admin\/locations\/[^/]+\/edit/u);
    await page.keyboard.press("Escape");
    await expect(userMenu).toBeFocused();

    await page.setViewportSize({ width: 320, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByTestId("nav-mobile-menu-toggle").click();
    await expect(page.getByTestId("nav-admin-mobile")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "移动端导航" }).getByRole("link").first()).toBeVisible();
    await page.screenshot({ path: "test-results/personal-menu-mobile.png" });
    const mobileTrigger = page.getByRole("button", { name: "快速添加地点" });
    await mobileTrigger.click();
    await expect(dialog).toBeVisible();
    const mobileBox = await dialog.locator("[data-gomate-modal-panel]").boundingBox();
    expect(mobileBox).not.toBeNull();
    expect(mobileBox!.width).toBeCloseTo(320, 0);
    expect(mobileBox!.y + mobileBox!.height).toBeCloseTo(720, 0);
    await dialog.locator('[data-slot="collapsible-trigger"]').click();
    const checkbox = dialog.getByRole("checkbox").first();
    await checkbox.check();
    const checkmark = checkbox.locator("[data-sw-checkbox-check-icon]");
    await expect(checkmark).toHaveCSS("animation-name", "none");
    await expect(checkmark).toHaveCSS("stroke-dashoffset", "0px");
    await expect(checkmark).toHaveCSS("opacity", "1");
    const reducedDuration = await dialog.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).transitionDuration),
    );
    expect(reducedDuration).toBeLessThanOrEqual(0.001);
    await expectNoHorizontalOverflow(page);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("nav-mobile-menu-toggle")).toBeFocused();
    await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  });
  test("public personal options hide admin actions from guests and regular users", async ({ page }) => {
    await useChineseLocale(page);
    for (const user of [null, regularUser]) {
      if (user) await authenticate(page, user);
      for (const width of [1440, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/");
        if (width === 320) await page.getByTestId("nav-mobile-menu-toggle").click();
        else if (user) await page.locator("[data-user-menu] > button").click();
        else await expect(page.getByTestId("nav-login")).toBeVisible();
        await expect(page.getByRole("link", { name: "管理后台", exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "快速添加地点" })).toHaveCount(0);
      }
    }
  });

  test("public personal options remain accessible in English and dark mode", async ({ page }) => {
    await authenticate(page, admin);
    await page.context().addCookies([{ name: "gomate_locale", value: "en", url: LOCAL_ORIGIN }]);
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const trigger = width === 320 ? page.getByTestId("nav-mobile-menu-toggle") : page.locator("[data-user-menu] > button");
      await trigger.focus();
      await page.keyboard.press("Enter");
      const action = page.getByRole(width === 320 ? "button" : "menuitem", { name: "Quick add location" });
      await expect(action).toBeVisible();
      await expect(page.getByRole(width === 320 ? "link" : "menuitem", { name: "Admin", exact: true })).toBeVisible();
      if (width === 320) {
        await action.focus();
      } else {
        await expect(page.getByRole("menuitem", { name: "Profile", exact: true })).toBeFocused();
        for (let step = 0; step < 3; step++) await page.keyboard.press("ArrowDown");
      }
      await expect(action).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expectNoHorizontalOverflow(page);
    }
  });

});
