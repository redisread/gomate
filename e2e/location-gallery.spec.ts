import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.route("**/api/locations/motion-gallery", (route) =>
    route.fulfill({
      json: {
        success: true,
        location: {
          id: "motion-gallery",
          name: "山间营地",
          slug: "motion-gallery",
          regionId: "sz",
          status: "published",
          supportedActivityTypes: ["hiking"],
          extra: {},
          description: "山间营地图片展示测试",
          coverImageUrl: "/gallery-a.svg",
          images: ["/gallery-b.svg", "/gallery-c.svg"],
          latitude: 22.6,
          longitude: 114.2,
        },
      },
    }),
  );
  await page.route("**/gallery-*.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#aec8bc"/><path d="M0 800 420 180 850 800M400 800 900 100 1200 800" fill="#456659"/></svg>`,
    }),
  );
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
});

test("lightbox preserves decoded image on failure and retries latest selection", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/locations/motion-gallery");
  await page
    .getByRole("button", { name: "查看大图 · 图片 1", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("img", { name: "图片 1", exact: true }),
  ).toHaveAttribute("src", "/gallery-a.svg");
  let fail = true;
  await page.route("**/gallery-b.svg", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="tan"/></svg>',
        }),
  );
  await dialog.getByRole("button", { name: "下一张", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("图片加载失败");
  await expect(
    dialog.getByRole("img", { name: "图片 1", exact: true }),
  ).toHaveAttribute("src", "/gallery-a.svg");
  fail = false;
  await dialog.getByRole("button", { name: "重试", exact: true }).click();
  await expect(
    dialog.getByRole("img", { name: "图片 2", exact: true }),
  ).toHaveAttribute("src", "/gallery-b.svg");
  await dialog
    .getByRole("button", { name: "切换到第 1 张", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "切换到第 3 张", exact: true })
    .click();
  await expect(
    dialog.getByRole("img", { name: "图片 3", exact: true }),
  ).toHaveAttribute("src", "/gallery-c.svg");
  await page.keyboard.press("Escape");
  await page.keyboard.press("ArrowRight");
  await expect(dialog).not.toBeVisible();
});

test.describe("touch", () => {
  test.use({ hasTouch: true });
  test("320px retry remains clickable and dialog restores focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await setup(page);
    await page.route("**/gallery-a.svg", (route) =>
      route.fulfill({ status: 503, body: "unavailable" }),
    );
    await page.goto("/locations/motion-gallery");
    const retry = page.getByRole("button", { name: "重试", exact: true });
    await expect(retry).toBeVisible();
    await page.unroute("**/gallery-a.svg");
    await retry.click();
    await expect(
      page.getByRole("img", { name: "山间营地 · 图片 1", exact: true }),
    ).toHaveAttribute("src", "/gallery-a.svg");
    const open = page.getByRole("button", {
      name: "查看大图 · 图片 1",
      exact: true,
    });
    await open.click();
    const dialog = page.getByRole("dialog");
    const close = dialog.getByRole("button", { name: "关闭", exact: true });
    await expect(close).toBeFocused();
    await close.press("Shift+Tab");
    await expect(
      dialog.getByRole("button", { name: "切换到第 3 张", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.screenshot({ path: ".wrangler/motion-gallery-mobile.png" });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

test("card hover responds to reduced motion and history return", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/locations/motion-gallery");
  const image = page.getByRole("img", {
    name: "山间营地 · 图片 1",
    exact: true,
  });
  await page
    .getByRole("button", { name: "查看大图 · 图片 1", exact: true })
    .hover();
  await expect(image).toHaveCSS(
    "transform",
    "matrix(1.015, 0, 0, 1.015, 0, 0)",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(image).toHaveCSS("transform", "none");
  await page.screenshot({ path: ".wrangler/motion-gallery-desktop.png" });
  await page.mouse.move(1279, 700);
  await page.goto("/locations");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goBack();
  await expect(image).toHaveCSS("opacity", "1");
});

test("focus on a failed card retry keeps the photo strip expanded after pointer leave", async ({
  page,
}) => {
  await setup(page);
  await page.route("**/gallery-b.svg", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("/locations/motion-gallery");
  const gallery = page.locator(".location-cover-gallery");
  await page
    .getByRole("button", { name: "查看大图 · 图片 1", exact: true })
    .hover();
  const retry = gallery.getByRole("button", { name: "重试", exact: true });
  await retry.focus();
  await page.mouse.move(1279, 700);
  await expect(gallery).toHaveAttribute("data-expanded", "true");
  await expect(retry).toBeFocused();
  await expect(retry).toBeEnabled();
});
