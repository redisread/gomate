import { expect, test, type Page } from "@playwright/test";

const team = {
  id: "invitation-layout",
  title: "周末，一起去山野走走",
  description: "沿着山径慢慢走，和新伙伴一起遇见好风景。\n\n".repeat(12),
  startAt: "2027-04-17T01:30:00Z",
  endAt: "2027-04-17T07:30:00Z",
  lifecycle: "pending",
  recruitmentStatus: "open",
  isFull: false,
  activeParticipantCount: 10,
  maxParticipants: 12,
  meetingPoint: "地铁站 A 出口集合，认准领队的橙色背包。",
  requirements: ["穿舒适的徒步鞋", "带上饮用水和简单午餐"],
  leader: { id: "leader", name: "林间", extra: { level: "intermediate" } },
  location: {
    id: "wutong",
    name: "梧桐山",
    coverImageUrl: "/invitation-photo.svg",
    region: { name: "深圳", nameEn: "Shenzhen" },
  },
  participants: Array.from({ length: 10 }, (_, i) => ({
    userId: `partner-${i}`,
    leftAt: null,
    user: { id: `partner-${i}`, name: `同行伙伴 ${i + 1}`, extra: {} },
  })),
};

async function setup(
  page: Page,
  role: "visitor" | "member" | "leader" = "visitor",
  overrides = {},
) {
  await page.route("**/api/teams/invitation-layout", (route) =>
    route.fulfill({ json: { success: true, team: { ...team, ...overrides } } }),
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      json: {
        user: role === "visitor" ? null : { id: role, name: role, extra: {} },
      },
      status: role === "visitor" ? 401 : 200,
    }),
  );
  await page.route("**/api/teams/invitation-layout/my-status", (route) =>
    route.fulfill({ json: { success: true, status: role } }),
  );
  await page.route("**/invitation-photo.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#c8d9cc"/><circle cx="930" cy="180" r="85" fill="#f3daa0"/><path d="M0 900V650L420 180 920 900" fill="#75917d"/><path d="M260 900 860 300 1200 640V900" fill="#476b59"/></svg>',
    }),
  );
}

for (const locale of ["zh-CN", "en"]) {
  test(`${locale}: invitation adapts to mobile, desktop, dark and reduced motion`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "gomate_locale", value: locale, url: baseURL! },
    ]);
    await setup(page);
    await page.goto("/teams/invitation-layout");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      team.title,
    );
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const mobile = width < 1024;
      const bar = page.getByTestId("team-mobile-action-bar");
      await expect(
        page.locator(
          'a[href="/login?redirect=/teams/invitation-layout"]:visible',
        ),
      ).toHaveCount(1);
      const login = page.locator(
        'a[href="/login?redirect=/teams/invitation-layout"]:visible',
      );
      await login.focus();
      await expect(login).toBeFocused();
      if (mobile) {
        await expect(bar).toBeVisible();
        const panel = (await page
          .getByTestId("team-decision-panel")
          .boundingBox())!;
        const cover = (await page
          .getByRole("img", { name: "梧桐山" })
          .boundingBox())!;
        expect(panel.y + panel.height).toBeLessThanOrEqual(cover.y);
        expect(
          await page
            .getByTestId("team-detail-content")
            .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)),
        ).toBeGreaterThan((await bar.boundingBox())!.height);
      } else {
        await expect(bar).toBeHidden();
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `.wrangler/team-shots/${locale}-${width}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await context.addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const expand = page
      .locator("button[aria-controls][aria-expanded]")
      .filter({ has: page.locator("svg") })
      .last();
    await expand.focus();
    await expand.press("Enter");
    await expect(expand).toBeFocused();
    await expect(expand).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("link", { name: "同行伙伴 10", exact: true }),
    ).toBeVisible();
    await expect(expand.locator("svg")).toHaveCSS(
      "transition-property",
      "none",
    );
    await expand.press("Enter");
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByRole("link", { name: "同行伙伴 10", exact: true }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `.wrangler/team-shots/${locale}-320-dark.png`,
      fullPage: true,
    });
  });
}

for (const role of ["member", "leader"] as const) {
  test(`${role}: meeting information and role actions are in the departure card`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "gomate_locale", value: "zh-CN", url: baseURL! },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await setup(page, role);
    await page.goto("/teams/invitation-layout");
    const brief = page.getByTestId("team-departure-brief");
    await expect(brief.getByText(team.meetingPoint)).toBeVisible();
    await expect(page.getByText(team.meetingPoint)).toHaveCount(1);
    await expect(page.getByTestId("team-mobile-action-bar")).toHaveCount(0);
    if (role === "member")
      await expect(brief.getByTestId("team-member-status")).toBeVisible();
    else
      await expect(brief.getByRole("button", { name: /组建/ })).toBeVisible();
    await page.screenshot({
      path: `.wrangler/team-shots/${role}-390.png`,
      fullPage: true,
    });
  });
}

test("long content, missing cover and ended state remain readable", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "en", url: baseURL! },
  ]);
  await page.setViewportSize({ width: 320, height: 800 });
  await setup(page, "visitor", {
    title: "A-very-long-unbroken-title".repeat(8),
    location: { ...team.location, coverImageUrl: null },
    lifecycle: "completed",
    recruitmentStatus: "closed",
    description: "# Itinerary\n\n" + "A-long-unbroken-direction".repeat(80),
  });
  await page.goto("/teams/invitation-layout");
  await expect(page.getByTestId("team-departure-brief")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.locator('a[href="/login?redirect=/teams/invitation-layout"]'),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("mobile keyboard focus remains above the fixed action bar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 650 });
  await setup(page);
  await page.goto("/teams/invitation-layout");
  await page
    .getByTestId("team-departure-brief")
    .locator('a[href="/teams"]')
    .focus();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const focused = document.activeElement;
          const bar = document.querySelector(
            '[data-testid="team-mobile-action-bar"]',
          );
          if (!focused || !bar || bar.contains(focused)) return true;
          const rect = focused.getBoundingClientRect();
          return (
            rect.bottom <= bar.getBoundingClientRect().top && rect.top >= 0
          );
        }),
      )
      .toBe(true);
  }
});
