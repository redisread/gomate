import { expect, test, type Page } from "@playwright/test";
import jsQR from "jsqr";
import { signUpUser } from "./fixtures";
import { loginAs } from "./helpers";

const place = {
  id: "poster-place",
  name: "山海之间的周末漫游",
  slug: "poster-place",
  regionId: "sz",
  status: "published",
  supportedActivityTypes: ["hiking", "explore"],
  subtitle: "沿着山脊，走到海风吹来的地方。",
  description: "从城市出发，沿山径慢慢走。".repeat(600),
  address: "OMITTED_ADDRESS",
  latitude: null,
  longitude: null,
  coverImageUrl: "/images/footer-landscape-small.webp",
  images: [],
  region: { name: "深圳" },
  extra: { hiking: { bestSeasons: ["spring", "秋季"] } },
};
async function setup(page: Page, signedIn = true, overrides = {}) {
  await page.route("**/api/locations/poster-place", (route) =>
    route.fulfill({
      json: { success: true, location: { ...place, ...overrides } },
    }),
  );
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      status: signedIn ? 200 : 401,
      json: {
        user: signedIn ? { id: "viewer", name: "Viewer", extra: {} } : null,
      },
    }),
  );
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({ json: { user: { role: "admin" } } }),
  );
  await page.route("**/api/teams?**", (route) =>
    route.fulfill({
      json: { success: true, teams: [], total: 0, nextCursor: null },
    }),
  );
}
async function open(page: Page, english = false) {
  await page
    .getByRole("button", {
      name: english ? "Share poster" : "分享海报",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  const image = dialog.getByRole("img");
  await expect(image).toBeVisible();
  await expect(image).toHaveJSProperty("naturalWidth", 1080);
  await expect(image).toHaveJSProperty("naturalHeight", 1440);
  return { dialog, image };
}
test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
});
test("requires login and returns focus to the top share action", async ({
  page,
}) => {
  await setup(page, false);
  await page.goto("/locations/poster-place");
  const action = page.getByRole("button", { name: "分享海报", exact: true });
  await action.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("登录后即可生成地点分享海报。");
  await expect(dialog.getByRole("img")).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "去登录" })).toHaveAttribute(
    "href",
    "/login?redirect=%2Flocations%2Fposter-place",
  );
  await page.keyboard.press("Escape");
  await expect(action).toBeFocused();
});
test("exports the location PNG and independently decodes its QR", async ({
  page,
  baseURL,
}) => {
  await setup(page);
  await page.goto("/locations/poster-place");
  const { dialog, image } = await open(page);
  await expect(dialog).toContainText("春季 · 秋季");
  await expect(dialog).toContainText(place.subtitle);
  await expect(dialog).not.toContainText(place.address);
  const pixels = await image.evaluate((element: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(element, 0, 0);
    return Array.from(ctx.getImageData(760, 1160, 280, 280).data);
  });
  expect(jsQR(new Uint8ClampedArray(pixels), 280, 280)?.data).toBe(
    `${baseURL}/locations/poster-place`,
  );
  const download = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "保存图片" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("gomate-location-poster-place.png");
  await file.saveAs(".wrangler/location-poster-shots/example.png");
  await page.screenshot({
    path: ".wrangler/location-poster-shots/desktop.png",
  });
});
test("keeps a fixed light poster on a narrow dark page with keyboard controls", async ({
  page,
  context,
  baseURL,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/locations/poster-place");
  const first = await open(page);
  const bytes = (img: HTMLImageElement) =>
    fetch(img.src)
      .then((r) => r.arrayBuffer())
      .then((b) => Array.from(new Uint8Array(b)));
  const light = await first.image.evaluate(bytes);
  await page.keyboard.press("Escape");
  await context.addCookies([{ name: "theme", value: "dark", url: baseURL! }]);
  await page.reload();
  const { dialog, image } = await open(page);
  expect(await image.evaluate(bytes)).toEqual(light);
  const save = dialog.getByRole("link", { name: "保存图片" });
  await expect(save).toBeInViewport();
  await save.focus();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "关闭", exact: true }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: ".wrangler/location-poster-shots/mobile.png" });
});
test("uses the first album photo and truncates the long introduction at a readable size", async ({
  page,
}) => {
  await setup(page, true, {
    coverImageUrl: null,
    images: [place.coverImageUrl],
    subtitle: null,
    name: "山海同行".repeat(50),
  });
  await page.goto("/locations/poster-place");
  await page.evaluate(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      const lines = JSON.parse(
        document.documentElement.dataset.posterLines ?? "[]",
      );
      document.documentElement.dataset.posterLines = JSON.stringify([
        ...lines,
        { value: args[0], y: args[2], font: this.font },
      ]);
      original.apply(this, args);
    };
  });
  const { dialog } = await open(page);
  await expect(dialog.getByRole("status")).toHaveCount(0);
  const lines: { value: string; y: number; font: string }[] =
    await page.evaluate(() =>
      JSON.parse(document.documentElement.dataset.posterLines ?? "[]"),
    );
  expect(
    lines.some(
      (line) => line.value.endsWith("…") && line.font.includes("32px"),
    ),
  ).toBe(true);
  expect(
    lines
      .filter((line) => line.y >= 1016 && line.y < 1184)
      .every((line) => line.y < 1156),
  ).toBe(true);
});
test("handles English missing fields and failed images, then retries fresh public data", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: "gomate_locale", value: "en", url: baseURL! },
  ]);
  await setup(page, true, {
    name: "A quiet trail beside the mountains",
    subtitle: null,
    description: "",
    region: undefined,
    extra: {},
    supportedActivityTypes: [],
    coverImageUrl: "/missing-poster.png",
  });
  await page.goto("/en/locations/poster-place");
  const { dialog, image } = await open(page, true);
  await expect(dialog.getByRole("status")).toContainText(
    "The photo is unavailable",
  );
  const pixels = await image.evaluate((element: HTMLImageElement) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1440;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(element, 0, 0);
    return Array.from(ctx.getImageData(760, 1160, 280, 280).data);
  });
  expect(jsQR(new Uint8ClampedArray(pixels), 280, 280)?.data).toBe(
    `${baseURL}/en/locations/poster-place`,
  );
  await page.keyboard.press("Escape");
  let fail = true;
  await page.route("**/api/locations/poster-place", (route) =>
    fail
      ? route.fulfill({ status: 404, json: { success: false } })
      : route.fulfill({
          json: { success: true, location: { ...place, name: "Fresh place" } },
        }),
  );
  await page.getByRole("button", { name: "Share poster", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  fail = false;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("img")).toHaveAttribute(
    "alt",
    "Location share poster for Fresh place",
  );
});

test("generates through a real local session and published location API", async ({
  page,
}) => {
  const run = Date.now().toString(36);
  const user = await signUpUser(
    `location-poster-${run}@e2e.gomate.test`,
    "test1234",
    `Poster ${run}`,
  );
  await loginAs(page, user.email, user.password);
  const response = await page.request.get("/api/locations?limit=1");
  const { locations } = await response.json();
  expect(locations.length).toBeGreaterThan(0);
  await page.route("**/api/proxy-image?**", (route) => route.abort());
  await page.goto(`/locations/${locations[0].id}`);
  const { dialog } = await open(page);
  await expect(dialog.getByRole("img")).toHaveAttribute(
    "alt",
    `${locations[0].name}的地点分享海报`,
  );
});
