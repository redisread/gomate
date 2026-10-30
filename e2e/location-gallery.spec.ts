import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page, count = 3) {
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
          coverImageUrl: count ? "/gallery-a.svg" : null,
          images: ["/gallery-b.svg", "/gallery-c.svg"].slice(
            0,
            Math.max(0, count - 1),
          ),
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
  let fail = true;
  await page.route("**/gallery-b.svg", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.fulfill({
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="tan"/></svg>',
        }),
  );
  await page.goto("/locations/motion-gallery");
  await page
    .getByRole("button", { name: "查看大图 · 图片 1", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("img", { name: "图片 1", exact: true }),
  ).toHaveAttribute("src", "/gallery-a.svg");
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
    await expect.poll(() => page.getByRole("img", { name: "山间营地 · 图片 1", exact: true }).evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
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

test("cover cycles and retains image on failure", async ({ page }) => {
  await setup(page);
  await page.goto("/locations/motion-gallery");
  const gallery = page.locator(".location-cover-gallery");
  await gallery.getByRole("button", { name: "上一张", exact: true }).click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 3", exact: true }),
  ).toBeVisible();
  await gallery.getByRole("button", { name: "下一张", exact: true }).click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 1", exact: true }),
  ).toBeVisible();
  await page.route("**/gallery-b.svg", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await gallery
    .getByRole("button", { name: "下一张", exact: true })
    .press("ArrowRight");
  await expect(gallery.getByRole("alert")).toContainText("图片加载失败");
  await expect(
    gallery.getByRole("img", { name: "山间营地 · 图片 1", exact: true }),
  ).toBeVisible();
  const failedRetry = gallery.getByRole("button", {
    name: "重试",
    exact: true,
  });
  await failedRetry.focus();
  await failedRetry.press("ArrowRight");
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 3", exact: true }),
  ).toBeVisible();
  await expect(
    gallery.getByRole("button", { name: "下一张", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(gallery.getByRole("alert")).toContainText("图片加载失败");
  await page.unroute("**/gallery-b.svg");
  const retry = gallery.getByRole("button", { name: "重试", exact: true });
  await retry.focus();
  await retry.press("Enter");
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 2", exact: true }),
  ).toBeVisible();
  const next = gallery.getByRole("button", { name: "下一张", exact: true });
  await expect(next).toBeFocused();
  await next.press("ArrowRight");
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 3", exact: true }),
  ).toBeVisible();
});
test("reduced motion removes cards whose native exit animation was interrupted", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.matches('[data-cover-card][aria-hidden="true"]')) {
        queueMicrotask(() => {
          animation.cancel();
          document.documentElement.dataset.interruptedCoverExit = "true";
        });
      }
      return animation;
    };
  });
  await setup(page);
  await page.goto("/locations/motion-gallery");
  const gallery = page.locator(".location-cover-gallery");
  const next = gallery.getByRole("button", { name: "下一张", exact: true });
  await next.click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 2", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-interrupted-cover-exit",
    "true",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
  await expect(next).toBeFocused();
});

test("reversing an exit keeps the returning card and focused controls", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/locations/motion-gallery");
  const gallery = page.locator(".location-cover-gallery");
  const next = gallery.getByRole("button", { name: "下一张", exact: true });
  const previous = gallery.getByRole("button", { name: "上一张", exact: true });
  await next.click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 2", exact: true }),
  ).toBeVisible();
  await previous.click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 1", exact: true }),
  ).toBeVisible();
  await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
  await expect(previous).toBeFocused();
  await expect(gallery.locator("[data-cover-card]")).toHaveCSS(
    "transform",
    "none",
  );
  await expect(gallery.locator("[data-cover-card]")).toHaveCSS("opacity", "1");
  const currentImage = gallery.getByRole("button", {
    name: "查看大图 · 图片 1",
    exact: true,
  });
  await currentImage.focus();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(currentImage).toBeFocused();
  await next.click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 2", exact: true }),
  ).toBeVisible();
  await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await next.click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 3", exact: true }),
  ).toBeVisible();
  await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
});

test("drag switches cards without opening lightbox", async ({ page }) => {
  await setup(page);
  await page.goto("/locations/motion-gallery");
  const gallery = page.locator(".location-cover-gallery");
  const open = gallery.getByRole("button", {
    name: "查看大图 · 图片 1",
    exact: true,
  });
  const box = (await open.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 18, y, { steps: 8 });
  await page.mouse.up();
  await expect(open).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 150, y, { steps: 12 });
  await page.mouse.up();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 2", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await gallery.getByRole("button", { name: "下一张", exact: true }).click();
  await expect(
    gallery.getByRole("button", { name: "查看大图 · 图片 3", exact: true }),
  ).toBeVisible();
  await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
  await expect(gallery.locator("[data-cover-card]")).toHaveCSS(
    "transform",
    "none",
  );
  await page.screenshot({ path: ".wrangler/swipe-cover-desktop.png" });
});

for (const count of [0, 1]) {
  test("cover with " + count + " photos hides navigation", async ({ page }) => {
    await setup(page, count);
    await page.goto("/locations/motion-gallery");
    const gallery = page.locator(".location-cover-gallery");
    await expect(gallery).toBeVisible();
    await expect(
      gallery.getByRole("button", { name: "下一张", exact: true }),
    ).toHaveCount(0);
    await expect(gallery.getByRole("button")).toHaveCount(count);
  });
}
test.describe("mobile swipe", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 800 } });
  test("touch swipe and keyboard focus survive switching in dark mode", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
    await setup(page);
    await page.goto("/locations/motion-gallery");
    const gallery = page.locator(".location-cover-gallery");
    const box = (await gallery
      .getByRole("button", { name: "查看大图 · 图片 1", exact: true })
      .boundingBox())!;
    const session = await context.newCDPSession(page);
    const x = box.x + box.width * 0.8,
      y = box.y + box.height / 2;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 10; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x - i * 14, y }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    const second = gallery.getByRole("button", {
      name: "查看大图 · 图片 2",
      exact: true,
    });
    await expect(second).toBeVisible();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await second.focus();
    await second.press("ArrowRight");
    const third = gallery.getByRole("button", {
      name: "查看大图 · 图片 3",
      exact: true,
    });
    await expect(third).toBeFocused();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
    await page.screenshot({ path: ".wrangler/swipe-cover-mobile-dark.png" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await third.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(third).toBeFocused();
  });
});

test("rapid full cycle restores a card that was still exiting", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/locations/motion-gallery");
  const gallery = page.locator(".location-cover-gallery");
  for (const index of [2, 3, 1]) {
    await gallery.getByRole("button", { name: "下一张", exact: true }).click();
    await expect(
      gallery.getByRole("button", {
        name: "查看大图 · 图片 " + index,
        exact: true,
      }),
    ).toBeVisible();
  }
  await expect(gallery.locator("[data-cover-card]")).toHaveCount(1);
  await expect(gallery.locator("[data-cover-card]")).toHaveCSS("opacity", "1");
  await expect(gallery.locator("[data-cover-card]")).toHaveCSS(
    "transform",
    "none",
  );
});
