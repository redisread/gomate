import { test, expect } from "@playwright/test";

test("language menu offers only Chinese and English and preserves location query", async ({
  page,
}) => {
  await page.goto("/zh-CN/locations?search=mountain");
  const selector = page
    .locator("[data-locale-toggle]")
    .filter({ visible: true })
    .first();
  await selector.getByRole("button", { name: "中文", exact: true }).click();
  await expect(selector.getByRole("menuitemradio")).toHaveCount(2);
  await expect(
    selector.getByRole("menuitemradio", { name: "English" }),
  ).toBeVisible();
  await expect(selector.getByText("日本語")).toHaveCount(0);
  await selector.getByRole("menuitemradio", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/locations\?search=mountain$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("removed Japanese URLs and translation resources are not served or redirected", async ({
  request,
}) => {
  for (const path of ["/ja/locations", "/locales/ja/common.json"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers().location).toBeUndefined();
  }
});
