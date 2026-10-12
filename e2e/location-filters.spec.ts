import { expect, test } from "@playwright/test";

test.use({ locale: "zh-CN" });

async function openList(page: import("@playwright/test").Page) {
  await page.goto("/locations");
  await expect(page.getByRole("button", { name: "更多城市", exact: true })).toBeVisible();
}

const cities = (page: import("@playwright/test").Page) => page.getByRole("group", { name: "城市", exact: true });
const cards = (page: import("@playwright/test").Page) => page.locator('a[href^="/locations/"]');

test("城市和兴趣即时筛选，局部清除及刷新恢复", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openList(page);
  const filters = page.getByTestId("locations-filters");
  const originalHeight = (await filters.boundingBox())!.height;
  await page.getByRole("group", { name: "兴趣", exact: true }).getByRole("button", { name: "周末", exact: true }).click();
  await cities(page).getByRole("button", { name: "深圳市", exact: true }).click();
  await expect(cities(page).getByRole("button", { name: "深圳市", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.get("tags")).toBeTruthy();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  expect((await filters.boundingBox())!.height).toBe(originalHeight);
  await page.reload();
  await expect(cities(page).getByRole("button", { name: "深圳市", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "兴趣", exact: true }).getByRole("button", { name: "周末", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "清除筛选", exact: true }).click();
  await expect(cities(page).getByRole("button", { name: "不限", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).searchParams.has("tags")).toBe(false);
  expect(errors).toEqual([]);
});

test("可搜索城市浮层支持键盘选择及关闭后焦点恢复", async ({ page }) => {
  await openList(page);
  const trigger = page.getByRole("button", { name: "更多城市", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "选择城市", exact: true });
  const search = dialog.getByRole("combobox", { name: "搜索城市", exact: true });
  await expect(search).toBeFocused();
  await search.fill("柳州");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(cities(page).getByRole("button", { name: "柳州市", exact: true })).toHaveAttribute("aria-pressed", "true");
  for (const city of ["深圳市", "惠州市", "香港", "长沙市", "成都市", "昆明市"]) await expect(cities(page).getByRole("button", { name: city, exact: true })).toBeVisible();
  await trigger.click();
  await search.press("Tab");
  await expect(dialog.getByRole("button", { name: "关闭", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(search).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("手机横滑保持页面宽度，面板及 reduced-motion 可用", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await openList(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  const rail = page.getByTestId("locations-city-options");
  expect(await rail.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  const trigger = page.getByRole("button", { name: "更多城市", exact: true });
  expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(trigger).toBeInViewport();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "选择城市", exact: true });
  const bounds = (await dialog.boundingBox())!;
  expect(bounds.x).toBe(0);
  expect(Math.round(bounds.y + bounds.height)).toBe(800);
  expect(await dialog.getByRole("combobox").evaluate((node) => getComputedStyle(node).fontSize)).toBe("16px");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("mobile-dark.png") });
});

test("更新保留旧结果，失败后原条件重试", async ({ page }) => {
  await openList(page);
  const originalFirst = await cards(page).first().getAttribute("href");
  let fail = true;
  await page.route("**/api/locations?*", async (route) => {
    if (fail) {
      await route.fulfill({ status: 503, json: { success: false } });
      fail = false;
    } else await route.continue();
  });
  await cities(page).getByRole("button", { name: "深圳市", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("地点更新失败");
  expect(await cards(page).first().getAttribute("href")).toBe(originalFirst);
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("regionId")).toBe("region-cn-shenzhen");
});

test("详情返回恢复分页窗口、筛选条件和列表滚动位置", async ({ page }) => {
  await openList(page);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("cursor")).toBeTruthy();
  const currentURL = page.url();
  const link = cards(page).nth(3);
  await link.scrollIntoViewIfNeeded();
  const href = await link.getAttribute("href");
  await link.click();
  await page.waitForURL(`**${href}`);
  await page.goBack();
  await expect(page.getByRole("button", { name: "更多城市", exact: true })).toBeVisible();
  expect(page.url()).toBe(currentURL);
  await expect(cards(page).nth(3)).toHaveAttribute("href", href!);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
  await expect(page.getByRole("button", { name: "上一页", exact: true })).toBeEnabled();
});


test("分享的分页链接在新页面仍能下一页再返回落地窗口", async ({ page, context }) => {
  await openList(page);
  await page.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  const shareURL = page.url();
  const landingLink = await cards(page).first().getAttribute("href");
  const sharedPage = await context.newPage();
  await sharedPage.goto(shareURL);
  await expect(sharedPage.getByRole("button", { name: "更多城市", exact: true })).toBeVisible();
  await expect(cards(sharedPage).first()).toHaveAttribute("href", landingLink!);
  await sharedPage.getByRole("button", { name: "下一页", exact: true }).click();
  await expect(sharedPage.locator('[aria-busy="true"]')).toHaveCount(0);
  await sharedPage.getByRole("button", { name: "上一页", exact: true }).click();
  await expect(sharedPage.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(cards(sharedPage).first()).toHaveAttribute("href", landingLink!);
  await sharedPage.close();
});
