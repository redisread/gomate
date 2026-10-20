import { test, expect } from "@playwright/test";

for (const locale of ["zh-CN", "en"] as const) {
  test(`${locale} selected location failure is visible and keyboard retry recovers`, async ({
    page,
    request,
  }) => {
    const response = await request.get("/api/locations?limit=1");
    expect(response.ok()).toBe(true);
    const { locations } = await response.json();
    const location = locations[0];
    expect(location).toBeTruthy();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/api/users/me", (route) =>
      route.fulfill({
        json: {
          success: true,
          user: {
            id: "recovery-test",
            name: "Recovery",
            extra: { wechat: "test-only" },
          },
        },
      }),
    );
    let attempts = 0;
    await page.route(`**/api/locations/${location.id}`, async (route) => {
      attempts += 1;
      if (attempts === 1)
        await route.fulfill({
          status: 503,
          json: { success: false, error: { message: "Unavailable" } },
        });
      else await route.continue();
    });
    await page.goto(`/${locale}/teams/create?locationId=${location.id}`);
    const alert = page
      .getByRole("alert")
      .filter({
        hasText:
          locale === "en"
            ? "Could not load location details"
            : "地点详情加载失败",
      });
    await expect(alert).toBeVisible();
    const retry = alert.getByRole("button", {
      name: locale === "en" ? "Retry" : "重试",
    });
    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(alert).toHaveCount(0);
    await expect(page.getByTestId("create-team-location")).toContainText(
      location.name,
    );
    expect(attempts).toBe(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
