import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`${theme} theme uses valid global tokens and follows a later theme change`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: "theme", value: theme, url: baseURL! }]);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/en/login");
    const background =
      theme === "dark" ? "oklch(0.174 0.007 78.1)" : "oklch(0.98 0.005 78.3)";
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      background,
    );
    for (const token of [
      "--background",
      "--foreground",
      "--primary",
      "--primary-300",
      "--border",
    ]) {
      expect(
        await page
          .locator("html")
          .evaluate(
            (el, name) => getComputedStyle(el).getPropertyValue(name).trim(),
            token,
          ),
      ).not.toBe("");
    }
    await page.evaluate(() =>
      document.documentElement.classList.toggle("dark"),
    );
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      theme === "dark" ? "oklch(0.98 0.005 78.3)" : "oklch(0.174 0.007 78.1)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("create-team metadata is translated on the server", async ({
  request,
}) => {
  const response = await request.get("/en/teams/create");
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).not.toContain("<title>创建队伍");
  expect(html).toContain("<title>Create Team");
});

for (const locale of ["zh-CN", "en"] as const) {
  test(`${locale} static page SEO uses explicit translated keys`, async ({
    request,
  }) => {
    const content = JSON.parse(
      readFileSync(
        new URL(`../public/locales/${locale}/content.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const [path, key] of [
      ["login", "login"],
      ["locations", "locations"],
      ["teams", "teams"],
      ["help", "help"],
      ["privacy", "privacy"],
      ["teams/create", "createTeam"],
    ] as const) {
      const response = await request.get(`/${locale}/${path}`);
      expect(response.ok()).toBe(true);
      expect(await response.text()).toContain(
        `<title>${content.seo_pages[key]}</title>`,
      );
    }
  });
}
