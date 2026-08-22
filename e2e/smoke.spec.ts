import { test, expect } from "@playwright/test";

test("built Worker serves the home page and health API", async ({
  page,
  request,
}) => {
  const home = await page.goto("/");
  expect(home?.ok()).toBe(true);
  await expect(page.locator("body")).toContainText("GoMate");

  const health = await request.get("/api/health");
  expect(health.ok()).toBe(true);
  await expect(health.json()).resolves.toMatchObject({ status: "ok" });
});
