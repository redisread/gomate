import { expect, test, type Page } from "@playwright/test";

const place = {
  id: "journal-layout",
  name: "山海之间的一次周末漫游",
  slug: "journal-layout",
  regionId: "sz",
  status: "published",
  supportedActivityTypes: ["hiking", "explore"],
  subtitle: "沿着山脊，走到海风吹来的地方。",
  description: "从城市出发，沿着山径慢慢走。".repeat(45),
  address: "深圳市很长的一条街道与集合地点说明".repeat(8),
  latitude: 22.6,
  longitude: 114.2,
  coverImageUrl: "/journal-photo.svg",
  images: [],
  extra: { hiking: { bestSeasons: ["spring", "autumn"] } },
};
async function setup(page: Page, english = false) {
  await page.route("**/api/locations/journal-layout", (route) =>
    route.fulfill({
      json: {
        success: true,
        location: english
          ? {
              ...place,
              name: "A weekend wandering between the mountains and the sea",
              subtitle: "A little fresh air, a little good company.",
              description:
                "A winding path with a view around every corner. ".repeat(45),
              address: "A-long-unbroken-address-with-directions".repeat(15),
            }
          : place,
      },
    }),
  );
  await page.route("**/journal-photo.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#aec8bc"/><path d="M0 600 420 80 850 600M400 600 780 180 900 600" fill="#456659"/></svg>',
    }),
  );
  await page.route("**/api/teams?**", (route) =>
    route.fulfill({
      json: { success: true, teams: [], total: 0, nextCursor: null },
    }),
  );
}

for (const locale of ["zh-CN", "en"]) {
  test(`${locale}: narrow dark page keeps actions reachable and long text inside the viewport`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: "gomate_locale", value: locale, url: baseURL! },
      { name: "theme", value: "dark", url: baseURL! },
    ]);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setup(page, locale === "en");
    await page.goto("/locations/journal-layout");
    const title = page.getByRole("heading", { level: 1 });
    await expect(title).toHaveText(
      locale === "en"
        ? "A weekend wandering between the mountains and the sea"
        : place.name,
    );
    const actions = page.getByTestId("location-mobile-actions");
    await expect(actions).toBeVisible();
    await expect(actions.locator('a[href*="/teams/create"]')).toBeInViewport();
    await expect(
      page.locator('a[href*="/teams/create?locationId="]:visible'),
    ).toHaveCount(1);
    await actions.locator('a[href="#location-teams"]').click();
    await expect(page.locator("#location-teams-title")).toBeInViewport();
    await expect(page.locator("#location-teams-title")).toBeVisible();
    const expand = page.getByRole("button", {
      name: locale === "en" ? "Expand all" : "展开全文",
      exact: true,
    });
    await expect(expand).toBeVisible();
    await expand.focus();
    await page.keyboard.press("Enter");
    const collapse = page.getByRole("button", {
      name: locale === "en" ? "Collapse" : "收起",
      exact: true,
    });
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await collapse.press("Enter");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.screenshot({
      path: `.wrangler/journal-shots/${locale}-320-dark.png`,
      fullPage: true,
    });
  });
}

test("desktop places title beside photos and keeps a single primary create action", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page);
  await page.goto("/locations/journal-layout");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(place.name);
  const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  const photo = (await page.locator(".location-cover-gallery").boundingBox())!;
  expect(title.x).toBeGreaterThan(photo.x + photo.width);
  expect(title.y).toBeLessThan(photo.y + photo.height);
  await expect(
    page.locator('a[href*="/teams/create?locationId="]:visible'),
  ).toHaveCount(1);
  await expect(page.getByTestId("location-mobile-actions")).toBeHidden();
  await page.screenshot({
    path: ".wrangler/journal-shots/desktop-long.png",
    fullPage: true,
  });
});

test("team failure can be retried without claiming there are no teams", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
  await setup(page);
  let fail = true;
  await page.route("**/api/teams?**", (route) =>
    fail
      ? route.fulfill({ status: 503, json: { success: false } })
      : route.fulfill({
          json: { success: true, teams: [], total: 0, nextCursor: null },
        }),
  );
  await page.goto("/locations/journal-layout");
  await expect(page.getByRole("alert")).toHaveText(
    "暂时无法加载队伍，请重试。",
  );
  await expect(page.getByText("这趟旅程，等一个发起人")).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "重试", exact: true }).click();
  await expect(page.getByText("这趟旅程，等一个发起人")).toBeVisible();
});

test("320px ticket cards wrap long team names and keep the full date accessible", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "en", url: baseURL! },
  ]);
  await page.setViewportSize({ width: 320, height: 800 });
  await setup(page, true);
  await page.route("**/api/teams?**", (route) =>
    route.fulfill({
      json: {
        success: true,
        total: 16,
        nextCursor: "next-page",
        teams: [
          {
            id: "journal-team",
            locationId: place.id,
            leaderId: "leader",
            activityType: "hiking",
            title: "A-long-unbroken-team-name".repeat(5),
            startAt: "2027-01-08T09:00:00.000Z",
            endAt: "2027-01-08T12:00:00.000Z",
            maxParticipants: 8,
            activeParticipantCount: 3,
            recruitmentStatus: "open",
            lifecycle: "pending",
            isFull: false,
            cancelledAt: null,
            formedAt: null,
            requirements: [],
            leader: {
              name: "A very long name for our hiking leader",
              extra: {},
            },
          },
        ],
      },
    }),
  );
  await page.goto("/locations/journal-layout");
  const ticket = page.locator('a[href="/teams/journal-team"]');
  await expect(ticket).toBeVisible();
  await ticket.focus();
  await expect(ticket.locator("time")).toHaveAttribute("aria-label", /2027/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".wrangler/journal-shots/ticket-320.png" });
});
