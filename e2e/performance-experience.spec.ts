import { expect, test } from "@playwright/test";
import { signUpUser, patchWechat, createTeamAs, getFirstLocationId } from "./fixtures";

test("public detail and legal copy are readable before JavaScript", async ({ browser, request, baseURL }) => {
  const locations = await (await request.get("/api/locations?limit=1")).json();
  const location = locations.locations[0];
  const context = await browser.newContext({ javaScriptEnabled: false, locale: "zh-CN" });
  await context.addCookies([{ name: "gomate_locale", value: "zh-CN", url: baseURL! }]);
  const page = await context.newPage();
  try {
    const response = await page.goto(`${baseURL}/locations/${location.id}`);
    expect(response?.headers()["cache-control"]).toBe("private, no-store");
    await expect(page.getByRole("heading", { level: 1, name: location.name })).toBeVisible();
    if (location.coverImageUrl) await expect(page.locator("[data-cover-card] img").first()).toHaveAttribute("src", location.coverImageUrl);
    await page.goto(`${baseURL}/privacy`);
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("");
    expect(await page.locator("h2").count()).toBeGreaterThan(2);
    await context.addCookies([{ name: "gomate_locale", value: "en", url: baseURL! }]);
    await page.goto(`${baseURL}/privacy`);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/privacy/i);
    await page.goto(`${baseURL}/terms`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/terms/i);
    expect(await page.locator("h2").count()).toBeGreaterThan(2);
  } finally { await context.close(); }
});

test("hydration reuses detail data and idle browsing does not prefetch lists", async ({ page, request }) => {
  const locations = await (await request.get("/api/locations?limit=1")).json();
  const location = locations.locations[0];
  const repeats: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === `/api/locations/${location.id}`) repeats.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`/locations/${location.id}`);
  await expect(page.getByRole("heading", { level: 1, name: location.name })).toBeVisible();
  await expect(page.locator("astro-island[component-export='LocationDetailClient']")).not.toHaveAttribute("ssr", "");
  expect(repeats).toEqual([]);
  await expect(page.locator('link[rel="prefetch"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobile modal releases focus and background after an interrupted exit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/locations");
  const menu = page.getByRole("button", { name: /菜单|menu/i }).first();
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    for (const dialog of document.querySelectorAll("dialog")) {
      for (const animation of dialog.getAnimations({ subtree: true })) animation.cancel();
    }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(menu).toBeFocused();
  await expect(page.locator("body > [inert]")).toHaveCount(0);
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
});


test("SSR team content preserves the viewer privacy boundary and skips a duplicate detail read", async ({ page, request, baseURL }) => {
  const run = Date.now();
  const leader = await signUpUser(`ssr-${run}@e2e.gomate.test`, "test1234", "SSR leader");
  const privateContact = `private-contact-${run}`;
  await patchWechat(leader, privateContact);
  const start = Date.now() + 7 * 86400000;
  const id = await createTeamAs(leader, {
    locationId: await getFirstLocationId(), activityType: "hiking", title: `SSR title ${run}`,
    startAt: new Date(start).toISOString(), endAt: new Date(start + 3600000).toISOString(), maxParticipants: 5,
  });
  const anonymous = await request.get(`/teams/${id}`);
  expect(anonymous.headers()["cache-control"]).toBe("private, no-store");
  const publicHtml = await anonymous.text();
  expect(publicHtml).toContain(`SSR title ${run}`);
  expect(publicHtml).not.toContain(privateContact);
  const authorized = await request.get(`/teams/${id}`, { headers: { Cookie: leader.cookie } });
  expect(authorized.headers()["cache-control"]).toBe("private, no-store");
  expect(await authorized.text()).toContain(privateContact);
  await page.context().addCookies(leader.cookie.split("; ").map((pair) => {
    const separator = pair.indexOf("=");
    return { name: pair.slice(0, separator), value: pair.slice(separator + 1), url: baseURL! };
  }));
  const repeated: string[] = [];
  page.on("request", (r) => { if (new URL(r.url()).pathname === `/api/teams/${id}`) repeated.push(r.url()); });
  await page.goto(`/teams/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: `SSR title ${run}` })).toBeVisible();
  await expect(page.getByRole("link", { name: /编辑|Edit/i }).first()).toBeVisible();
  expect(repeated).toEqual([]);
});

test("a modal reopened during exit remains interactive and releases its background on the next close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/locations");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const menu = page.getByTestId("nav-mobile-menu-toggle");
  await menu.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  // A new controlled-open signal can arrive while the native dialog is exiting.
  await menu.evaluate((button) => (button as HTMLButtonElement).click());
  await expect(page.getByRole("dialog")).toHaveAttribute("data-state", "open");
  await page.waitForTimeout(250);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("body > [inert]").first()).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(menu).toBeFocused();
  await expect(page.locator("body > [inert]")).toHaveCount(0);
});

test("team browsing restores its cursor and scroll, and a failed filter keeps one retry with the old content", async ({ page, baseURL }) => {
  const run = Date.now();
  const title = `Browse-${run}`;
  const leader = await signUpUser(`browse-${run}@e2e.gomate.test`, "test1234", "Browse leader");
  await patchWechat(leader, "browse-contact");
  const locationId = await getFirstLocationId();
  const start = Date.now() + 7 * 86400000;
  for (let i = 0; i < 25; i++) {
    await createTeamAs(leader, {
      locationId, activityType: "hiking", title: `${title}-${i}`,
      startAt: new Date(start + i * 60000).toISOString(), endAt: new Date(start + 3600000 + i * 60000).toISOString(), maxParticipants: 5,
    });
  }
  await page.context().addCookies([{ name: "gomate_locale", value: "zh-CN", url: baseURL! }]);
  await page.goto(`/teams?q=${title}`);
  const cards = page.locator('section ul > li a[href^="/teams/"]');
  await expect(cards).toHaveCount(12);
  await page.getByRole("button", { name: "第 2 页", exact: true }).click();
  await expect(page.locator('section ul[aria-busy="true"]')).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("cursor")).toBeTruthy();
  const href = await cards.nth(6).getAttribute("href");
  const listURL = page.url();
  await cards.nth(6).scrollIntoViewIfNeeded();
  await cards.nth(6).click();
  await page.waitForURL(`**${href}`);
  await page.goBack();
  await expect(cards).toHaveCount(12);
  expect(page.url()).toBe(listURL);
  await expect(cards.nth(6)).toHaveAttribute("href", href!);
  await expect(page.getByRole("button", { name: "第 1 页", exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(400);
  await page.route("**/api/teams?**", (route) => route.fulfill({ status: 503, json: { success: false } }));
  await page.getByRole("searchbox").fill(`${title}-new`);
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.getByRole("alert").getByRole("button")).toHaveCount(1);
  await expect(cards).toHaveCount(12);
  await expect(page.getByText("更新未成功，当前显示上次的结果。")).toBeVisible();
});
