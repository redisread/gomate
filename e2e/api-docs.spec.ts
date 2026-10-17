import { test, expect } from "@playwright/test";

test("Scalar renders the public contract using only same-origin assets", async ({
  page,
  baseURL,
}) => {
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
  const response = await page.goto("/api/docs");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "GoMate API", exact: true }),
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
