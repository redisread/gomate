import { expect, test, type Page } from "@playwright/test";

const profileUser = {
  id: "profile-layout-user",
  name: "Victor",
  nickname: "Victor",
  email: "victor@example.com",
  image: null,
  bio: "周末徒步，也喜欢在城市里寻找新的路线。",
  gender: "male",
  birthday: "1998-10-22",
  extra: {
    level: "beginner",
    city: "region-shenzhen",
    completedHikes: 2,
    wechat: null,
  },
};

async function mockProfileRequests(page: Page) {
  await page.route("**/api/users/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, user: profileUser }),
  }));
  await page.route("**/api/users/me/created-teams", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, teams: [] }),
  }));
  await page.route("**/api/users/me/joined-teams", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, teams: [] }),
  }));
  await page.route("**/api/regions?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      regions: [{ id: "region-shenzhen", name: "深圳市" }],
    }),
  }));
  await page.route("**/api/messages/unread-count", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ success: true, count: 0 }),
  }));
}

for (const viewport of [
  { name: "mobile", width: 320, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
]) {
  test(`profile keeps identity and stats compact on ${viewport.name}`, async ({ page }) => {
    await mockProfileRequests(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/profile");

    const header = page.getByTestId("profile-header");
    await expect(header).toBeVisible();
    await expect(header.getByRole("heading", { level: 1, name: "Victor" })).toBeVisible();
    await expect(header.getByText("深圳市")).toBeVisible();

    const editProfile = header.locator('a[href="/profile/edit"]');
    const editBox = await editProfile.boundingBox();
    expect(editBox?.height).toBeGreaterThanOrEqual(44);

    const statLinks = page.getByTestId("profile-stats").getByRole("link");
    await expect(statLinks).toHaveCount(3);
    const statBoxes = await statLinks.evaluateAll((links) => links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { top: rect.top, height: rect.height };
    }));
    expect(Math.max(...statBoxes.map((box) => box.top)) - Math.min(...statBoxes.map((box) => box.top))).toBeLessThan(2);
    expect(Math.min(...statBoxes.map((box) => box.height))).toBeGreaterThanOrEqual(96);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    await expect(page.locator("footer")).toHaveCount(0);
  });
}
