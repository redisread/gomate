import { expect, test } from "@playwright/test";

for (const locale of ["zh-CN", "en"]) {
  test(`random discovery uses real API and persists history in ${locale}`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await context.addCookies([
      { name: "gomate_locale", value: locale, url: baseURL! },
    ]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(locale === "en" ? "/en" : "/");
    const section = page.getByTestId("home-random-discovery");
    const button = section.getByRole("button");
    await button.focus();
    const firstResponse = page.waitForResponse((r) =>
      r.url().includes("/api/locations/random"),
    );
    await button.press("Enter");
    const response = await firstResponse;
    expect(response.headers()["cache-control"]).toBe("no-store");
    const data = await response.json();
    expect(data.total).toBeGreaterThan(1);
    await expect(section.getByTestId("random-location-result")).toContainText(
      data.location.name,
    );
    await expect(button).toBeFocused();
    await section.screenshot({
      path: testInfo.outputPath("random-discovery.png"),
    });
    const nextRequest = page.waitForRequest((r) =>
      r.url().includes("/api/locations/random"),
    );
    await button.click();
    expect(new URL((await nextRequest).url()).searchParams.get("recent")).toBe(
      data.location.id,
    );
    await expect(button).toBeEnabled();
    await expect(
      section.getByTestId("random-location-result").getByRole("link"),
    ).not.toHaveAttribute("href", `/locations/${data.location.id}`);
    await page.reload();
    const afterReload = page.waitForRequest((r) =>
      r.url().includes("/api/locations/random"),
    );
    await section.getByRole("button").click();
    expect(
      new URL((await afterReload).url()).searchParams.get("recent")?.split(","),
    ).toHaveLength(2);
    expect(errors).toEqual([]);
  });
}

test("mobile reveal handles interruptions, failed photos, retry and empty catalogs", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({
    colorScheme: "dark",
    reducedMotion: "no-preference",
  });
  let calls = 0;
  await page.route("**/api/locations/random?*", async (route) => {
    calls++;
    if (calls === 2)
      return route.fulfill({ status: 503, json: { success: false } });
    return route.fulfill({
      json:
        calls === 3
          ? { success: true, location: null, total: 0 }
          : {
              success: true,
              location: {
                id: "test-place",
                name: "山野里的一个很长很长的地点名称",
                city: "测试城市",
                coverImageUrl: "/missing-random-image.png",
              },
              total: 1,
            },
    });
  });
  await page.goto("/");
  const section = page.getByTestId("home-random-discovery");
  const button = section.getByRole("button");
  await button.click();
  await expect(button).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section.getByTestId("random-location-result")).toBeVisible();
  await expect(section.getByRole("status")).toContainText("目前只有");
  expect(calls).toBe(1);
  await section.screenshot({ path: testInfo.outputPath("random-mobile.png") });
  await expect(section.locator("article img")).toHaveCount(0);
  await expect(button).toBeEnabled();
  await button.click();
  await expect(section.getByRole("status")).toContainText("请重试");
  await expect(section.getByTestId("random-location-result")).toBeVisible();
  await button.click();
  await expect(section.getByTestId("random-location-result")).toHaveCount(0);
  await expect(section.getByRole("status")).toContainText("暂时没有");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("photo wall fits tablet and desktop in both themes", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await context.addCookies([
    { name: "gomate_locale", value: "en", url: baseURL! },
  ]);
  await page.goto("/en");
  const section = page.getByTestId("home-random-discovery");
  await section.getByRole("button").click();
  await expect(section.getByTestId("random-location-result")).toBeVisible();
  await expect(section.getByRole("button")).toBeEnabled();
  for (const width of [768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const dark of [false, true]) {
      await page.evaluate(
        (value) => document.documentElement.classList.toggle("dark", value),
        dark,
      );
      await expect(section.getByRole("button")).toBeVisible();
      const box = await section.getByRole("button").boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: testInfo.outputPath(
          `random-${width}-${dark ? "dark" : "light"}.png`,
        ),
      });
    }
  }
});
