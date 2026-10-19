import { test, expect } from "@playwright/test";

test("footer follows the home content edge and keeps mobile legal links together", async ({ page }) => {
  await page.goto("/en");
  const footer = page.getByRole("contentinfo");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await footer.scrollIntoViewIfNeeded();
    const content = await page.getByTestId("home-map-section").locator(":scope > div").boundingBox();
    const padding = await page.getByTestId("home-map-section").locator(":scope > div").evaluate(el => parseFloat(getComputedStyle(el).paddingInlineStart));
    const email = await footer.locator('a[href^="mailto:"]').boundingBox();
    expect(Math.abs(email!.x - (content!.x + padding))).toBeLessThanOrEqual(1);
    if (width === 390) {
      const privacy = await footer.locator('a[href="/privacy"]').boundingBox();
      const terms = await footer.locator('a[href="/terms"]').boundingBox();
      expect(Math.abs(privacy!.y - terms!.y)).toBeLessThanOrEqual(1);
    }
  }
});

test("footer joins public pages without covering content and supports enlarged text", async ({ page }, testInfo) => {
  for (const path of ["/en", "/en/about", "/en/blog"]) {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: width === 390 ? "dark" : "light", reducedMotion: "reduce" });
      await footer.scrollIntoViewIfNeeded();
      const content = await page.locator("#main-content").boundingBox();
      const bounds = await footer.boundingBox();
      expect(Math.abs(content!.y + content!.height - bounds!.y)).toBeLessThanOrEqual(1);
      await footer.evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 180));
      await page.screenshot({ path: testInfo.outputPath(`join-${path.replaceAll("/", "-")}-${width}.png`), animations: "disabled" });
    }
  }
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  const footer = page.getByRole("contentinfo");
  for (const width of [320, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await footer.scrollIntoViewIfNeeded();
    expect(await footer.locator("a, button").evaluateAll(elements => elements.every(el => {
      const bounds = el.getBoundingClientRect();
      return bounds.x >= 0 && bounds.right <= innerWidth && el.scrollWidth <= el.clientWidth + 1;
    }))).toBe(true);
    await footer.screenshot({ path: testInfo.outputPath(`footer-enlarged-${width}.png`), animations: "disabled" });
  }
});

for (const locale of ["zh-CN", "en"]) {
  test(`${locale} postcard footer stays usable across sizes and themes`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/${locale}/about`);
    const footer = page.getByRole("contentinfo");
    const wechat = footer.getByRole("button", {
      name: locale === "en" ? "WeChat" : "微信",
      exact: true,
    });
    for (const width of [320, 390, 640, 768, 1440]) {
      await page.setViewportSize({ width, height: 1200 });
      await footer.scrollIntoViewIfNeeded();
      await expect(wechat).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const href of [
        "/locations",
        "/teams",
        "/teams/create",
        "/about",
        "/blog",
        "/feedback",
        "/help",
        "/privacy",
        "/terms",
      ]) {
        await expect(footer.locator(`a[href="${href}"]`)).toBeVisible();
      }
      expect(
        await footer.locator("a, button").evaluateAll((elements) =>
          elements.every((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width >= 44 && rect.height >= 44;
          }),
        ),
      ).toBe(true);
      for (const colorScheme of ["light", "dark"] as const) {
        await page.emulateMedia({ colorScheme });
        await expect(page.locator("html")).toHaveClass(
          colorScheme === "dark" ? /dark/ : /^(?!.*dark).*$/,
        );
        await expect
          .poll(() =>
            footer
              .locator("nav a")
              .first()
              .evaluate(
                (el) =>
                  getComputedStyle(el).color ===
                  getComputedStyle(el.closest("footer")!).color,
              ),
          )
          .toBe(true);
        if (width === 390 || width === 640 || width === 1440) {
          await footer
            .locator(".postcard-landscape img")
            .evaluate((image: HTMLImageElement) => image.decode());
          await footer.screenshot({
            animations: "disabled",
            path: `/tmp/footer-${locale}-${width}-${colorScheme}.png`,
            style: "astro-dev-toolbar { visibility: hidden }",
          });
        }
      }
    }
    await wechat.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", {
      name: locale === "en" ? "WeChat" : "微信",
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.locator("a[download]")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(dialog.getByRole("button").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(wechat).toBeFocused();
    await footer
      .getByRole("button", {
        name: locale === "en" ? "Back to Top" : "回到顶部",
        exact: true,
      })
      .click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test("footer navigation survives a failed illustration request", async ({
  page,
}) => {
  await page.route("**/images/footer-landscape*.webp", (route) =>
    route.abort(),
  );
  await page.goto("/en/about");
  const footer = page.getByRole("contentinfo");
  await footer.scrollIntoViewIfNeeded();
  await footer.locator('a[href="/help"]').click();
  await expect(page).toHaveURL(/\/help$/);
});

test("contact dialog keeps controls reachable in a short landscape viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/en/about");
  await page
    .getByRole("contentinfo")
    .getByRole("button", { name: "WeChat", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "WeChat", exact: true });
  const bounds = await dialog.locator("[data-gomate-modal-panel]").boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
  const download = dialog.locator("a[download]");
  await download.scrollIntoViewIfNeeded();
  await expect(download).toBeInViewport();
  const close = dialog.getByRole("button", { name: "Close", exact: true });
  await close.scrollIntoViewIfNeeded();
  await expect(close).toBeInViewport();
  await close.click();
  await expect(dialog).toHaveCount(0);
});
