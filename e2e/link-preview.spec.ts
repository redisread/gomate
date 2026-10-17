import { test, expect } from "@playwright/test";

for (const locale of ["zh-CN", "en"]) {
  test(`${locale} location link preview uses its public cover`, async ({
    page,
    request,
  }) => {
    const id = "location-shenzhen-wutongshan";
    const response = await request.get(`/api/locations/${id}`);
    expect(response.ok()).toBe(true);
    const { location } = await response.json();
    expect(location.coverImageUrl).toBeTruthy();
    await page.goto(`/${locale}/locations/${id}`);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      new URL(location.coverImageUrl, page.url()).href,
    );
    await expect(
      page.locator(
        'meta[property="og:image:width"], meta[property="og:image:height"]',
      ),
    ).toHaveCount(0);
  });
}
