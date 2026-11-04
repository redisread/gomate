import { expect, test, type Page } from "@playwright/test";

const nav = (page: Page) => page.locator("nav[data-main-navigation]");
async function ready(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.getByTestId("nav-slider")).toBeVisible();
  // The indicator only exists after the persistent React navigation has hydrated.
}

for (const locale of ["zh-CN", "en"]) {
  test(`${locale}: slider responds before loading, survives swaps, and restores history`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "gomate_locale", value: locale, url: baseURL! },
    ]);
    const prefix = locale === "en" ? "/en" : "";
    await ready(page, prefix || "/");
    const slider = await page.getByTestId("nav-slider").elementHandle();
    const home = nav(page).locator('[data-route="/"]');
    const locations = nav(page).locator('[data-route="/locations"]');
    const teams = nav(page).locator('[data-route="/teams"]');
    await page.evaluate(() => window.scrollTo(0, 350));
    const scroll = await page.evaluate(() => window.scrollY);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**${prefix}/locations`, async (route) => {
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    });
    await locations.click();
    await expect(nav(page)).toHaveAttribute("aria-busy", "true");
    await expect(home).toHaveAttribute("aria-current", "page");
    await expect
      .poll(async () => {
        const a = (await locations.boundingBox())!;
        const b = (await page.getByTestId("nav-slider").boundingBox())!;
        return Math.abs(a.x - b.x) + Math.abs(a.width - b.width);
      })
      .toBeLessThan(2);
    expect(new URL(page.url()).pathname).toBe(prefix || "/");
    release();
    await expect(locations).toHaveAttribute("aria-current", "page");
    expect(await slider!.evaluate((el) => el.isConnected)).toBe(true);
    await expect(nav(page)).toHaveAttribute("aria-busy", "false");
    await page.screenshot({ path: `.wrangler/nav-shots/${locale}.png` });
    await page.unroute(`**${prefix}/locations`);
    await teams.focus();
    await page.keyboard.press("Enter");
    await expect(teams).toHaveAttribute("aria-current", "page");
    expect(await slider!.evaluate((el) => el.isConnected)).toBe(true);
    await expect(page.locator("header nav[data-main-navigation]")).toHaveCount(
      1,
    );
    await page.goBack();
    await expect(locations).toHaveAttribute("aria-current", "page");
    await page.goBack();
    await expect(home).toHaveAttribute("aria-current", "page");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(scroll, -1);
    await page.goForward();
    await expect(locations).toHaveAttribute("aria-current", "page");
  });
}

test("latest click wins and an unsuccessful navigation restores the current selection", async ({
  page,
}) => {
  await ready(page);
  const slider = await page.getByTestId("nav-slider").elementHandle();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/locations", async (route) => {
    await gate;
    await route.abort();
  });
  await nav(page).locator('[data-route="/locations"]').click();
  await nav(page).locator('[data-route="/teams"]').click();
  await expect(nav(page).locator('[data-route="/teams"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  release();
  await expect(nav(page)).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await slider!.evaluate((el) => el.isConnected)).toBe(true);
  await page.unroute("**/locations");
  await page.route("**/locations", (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/html",
      body: "Unavailable",
    }),
  );
  await nav(page).locator('[data-route="/locations"]').click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(nav(page)).toHaveAttribute("aria-busy", "false");
  await expect(nav(page).locator('[data-route="/teams"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(new URL(page.url()).pathname).toMatch(/\/teams$/);
  await page.unroute("**/locations");
  await nav(page).locator('[data-route="/locations"]').click();
  await expect(nav(page).locator('[data-route="/locations"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("theme and session refresh survive navigation; reduced motion and mobile menu remain usable", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "theme", value: "system", url: baseURL! }]);
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  let sessionReads = 0;
  await page.route("**/api/users/me", async (route) => {
    sessionReads++;
    await route.continue();
  });
  await ready(page);
  await expect(page.locator("html")).toHaveClass(/dark/);
  const before = sessionReads;
  await nav(page).locator('[data-route="/locations"]').click();
  await expect(nav(page).locator('[data-route="/locations"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(() => sessionReads).toBeGreaterThan(before);
  await expect
    .poll(() =>
      page
        .getByTestId("nav-slider")
        .evaluate((el) => el.getAnimations().length),
    )
    .toBe(0);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(nav(page)).toBeHidden();
  const menu = page.getByTestId("nav-mobile-menu-toggle");
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(menu).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const route of ["locations", "teams"]) {
  test(`${route}: filtered list restores its latest scroll after a tab round trip`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "gomate_locale", value: "zh-CN", url: baseURL! },
    ]);
    await ready(page, `/${route}`);
    const search = page
      .locator('input[type="text"], input[type="search"]')
      .first();
    await search.fill("山");
    await expect.poll(() => new URL(page.url()).search).toContain("%E5%B1%B1");
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 500));
    const top = await page.evaluate(() => window.scrollY);
    expect(top).toBeGreaterThan(100);
    await nav(page).locator('[data-route="/"]').click();
    await expect(nav(page).locator('[data-route="/"]')).toHaveAttribute(
      "aria-current",
      "page",
    );
    await page.goBack();
    await expect(nav(page).locator(`[data-route="/${route}"]`)).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(search).toHaveValue("山");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(top, -1);
  });
}

test("a slow history traversal does not let the old list rewrite the destination URL", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
  await ready(page);
  await nav(page).locator('[data-route="/locations"]').click();
  await expect(nav(page).locator('[data-route="/locations"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.locator('input[type="text"]').first().fill("山");
  await expect.poll(() => new URL(page.url()).search).toContain("%E5%B1%B1");
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(baseURL! + "/", async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  const back = page.goBack();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  expect(new URL(page.url()).search).toBe("");
  release();
  await back;
  await expect(nav(page).locator('[data-route="/"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(new URL(page.url()).search).toBe("");
});

test("timeout rolls back and a late response cannot replace a newer page", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
  await ready(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/locations", async (route) => {
    const response = await route.fetch();
    await gate;
    await route.fulfill({ response });
  });
  await nav(page).locator('[data-route="/locations"]').click();
  await expect(nav(page)).toHaveAttribute("aria-busy", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .getByTestId("nav-slider")
        .evaluate(
          (el) =>
            el.getAnimations().filter((a) => a.playState === "running").length,
        ),
    )
    .toBe(0);
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  await expect(nav(page).locator('[data-route="/"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(nav(page)).toHaveAttribute("aria-busy", "false");
  await nav(page).locator('[data-route="/teams"]').click();
  await expect(nav(page).locator('[data-route="/teams"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  release();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/teams");
});

for (const route of ["locations", "teams"]) {
  test(`${route}: an unsuccessful tab change leaves the pending filter query intact`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "gomate_locale", value: "zh-CN", url: baseURL! }]);
    await ready(page, `/${route}`);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let cancelled = 0;
    page.on("requestfailed", request => { if (request.url().includes(`/api/${route}?`)) cancelled++; });
    await page.route(`**/api/${route}?*`, async routeHandler => {
      await gate;
      await routeHandler.fulfill({ json: { success: true, [route]: [], total: 0, nextCursor: null } });
    });
    const queryStarted = page.waitForRequest(request => request.url().includes(`/api/${route}?`));
    await page.locator('input[type="text"], input[type="search"]').first().fill("no-match-for-nav");
    await queryStarted;
    const destination = route === "locations" ? "teams" : "locations";
    await page.route(`**/${destination}`, handler => handler.fulfill({ status: 503, contentType: "text/html", body: "Unavailable" }));
    await nav(page).locator(`[data-route="/${destination}"]`).click();
    await expect(page.getByRole("alert")).toContainText("页面加载失败");
    const completed = page.waitForResponse(response => response.url().includes(`/api/${route}?`));
    release();
    await completed;
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    expect(cancelled).toBe(0);
    await expect(page.getByText(route === "locations" ? "没有找到「no-match-for-nav」相关地点" : "还没有人发起这类活动，要不要你来开头？", { exact: true })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`/${route}`);
  });
}
