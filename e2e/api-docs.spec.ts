import { test, expect } from "@playwright/test";

test("Scalar renders the public contract using only same-origin assets", async ({
  page,
  baseURL,
}, testInfo) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.protocol.startsWith("http") &&
      url.origin !== new URL(baseURL!).origin
    )
      externalRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-US" });
  const response = await page.goto("/api/docs");
  await expect(page).toHaveTitle("GoMate API 文档");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "GoMate API 文档", exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText("/health");
  await expect(page.locator("body")).not.toContainText("/admin/users");
  const script = page.locator('script[src*="/generated/scalar-"]');
  await expect(script).toHaveAttribute(
    "src",
    /\/generated\/scalar-1\.75\.0\/standalone\.js$/,
  );
  await page.screenshot({
    path: testInfo.outputPath("api-docs.png"),
    fullPage: false,
  });
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("admin documentation cannot be read anonymously", async ({ request }) => {
  for (const path of ["/api/admin/docs", "/api/admin/openapi.json"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  }
});

for (const width of [1280, 390]) {
  test(`documentation search and keyboard navigation work at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/api/docs");
    await expect(
      page.getByRole("heading", { name: "GoMate API 文档", exact: true }),
    ).toBeVisible();
    if (width < 768)
      await page.getByRole("button", { name: "打开菜单" }).click();
    await page.getByRole("button", { name: /打开搜索/ }).click();
    const search = page.getByRole("combobox", { name: "输入搜索查询" });
    await expect(search).toBeFocused();
    await search.fill("health");
    await expect(page.getByRole("dialog")).toContainText("/health");
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page).toHaveURL(/#.*health/i);
    await page.screenshot({
      path: testInfo.outputPath(`api-docs-${width}.png`),
    });
  });
}
