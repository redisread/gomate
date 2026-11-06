import { test, expect } from "@playwright/test";

for (const locale of ["zh-CN", "en"]) {
  for (const loggedIn of [false, true]) {
    test(`${locale} hero adapts to ${loggedIn ? "member" : "guest"}`, async ({ page }) => {
      await page.route("**/api/users/me", (route) => route.fulfill({
        status: loggedIn ? 200 : 401,
        contentType: "application/json",
        body: JSON.stringify(loggedIn ? { user: { id: "test-member", name: "Member", role: "user" } } : {}),
      }));
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
      await page.goto(`/${locale}/`);
      const hero = page.locator(".home-hero-shell");
      const login = hero.locator('a[href="/login?redirect=/teams"]');
      const description = locale === "zh-CN" ? "可以直接加入有名额的队伍" : "Join a team with room";
      const guestNote = hero.getByText(locale === "zh-CN" ? "浏览公开地点和队伍无需登录" : "Public places and teams are open to browse", { exact: true });
      if (loggedIn) {
        await expect(hero).toContainText(description);
        await expect(login).toHaveCount(0);
        await expect(guestNote).toHaveCount(0);
      } else {
        await expect(login).toBeVisible();
        await expect(guestNote).toBeVisible();
      }
      for (const width of [1280, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const primary = hero.locator('a[href="#guest-departures"]');
        await expect(primary).toBeVisible();
        await expect(primary).toHaveAccessibleName(locale === "zh-CN" ? "看看谁在出发" : "See who is heading out");
        await primary.focus();
        await expect(primary).toBeFocused();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    });
  }
}
