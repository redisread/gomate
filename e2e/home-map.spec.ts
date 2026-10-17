import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: "gomate_locale", value: "zh-CN", url: baseURL! },
  ]);
});

test("direct province URL paints the adaptive transform without a fallback frame", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observedTransforms: string[] = [];
    Object.defineProperty(window, "__mapObservedTransforms", {
      value: observedTransforms,
    });

    let lastTransform: string | null = null;
    const captureTransform = () => {
      const mapContent = document.querySelector('[data-testid="map-content"]');
      if (mapContent?.getAttribute("visibility") === "hidden") return;
      const transform = mapContent?.getAttribute("transform");
      if (transform && transform !== lastTransform) {
        lastTransform = transform;
        observedTransforms.push(transform);
      }
    };
    new MutationObserver(captureTransform).observe(document, {
      attributes: true,
      attributeFilter: ["transform", "visibility"],
      childList: true,
      subtree: true,
    });
  });

  const response = await page.goto("/?mapProvince=广东省");
  expect(response?.ok()).toBe(true);

  const mapContent = page.getByTestId("map-content");
  await expect(mapContent).toHaveAttribute("transform", /^matrix\(4\.5 /u);
  await page.evaluate(() => new Promise(requestAnimationFrame));

  const finalTransform = await mapContent.getAttribute("transform");
  const observedTransforms = await page.evaluate(
    () =>
      (
        window as Window & {
          __mapObservedTransforms: string[];
        }
      ).__mapObservedTransforms,
  );
  expect(observedTransforms).not.toContainEqual(
    expect.stringMatching(/^matrix\(3 /u),
  );
  expect(observedTransforms.at(-1)).toBe(finalTransform);
});

async function mockMap(page: import("@playwright/test").Page) {
  const region = { id: "region-sz", parentId: "province-gd", name: "深圳" };
  await page.route("**/api/locations/stats", (route) =>
    route.fulfill({
      json: {
        success: true,
        regions: [{ region, count: 2 }],
        points: [
          {
            id: "map-location-1",
            name: "梧桐山",
            region,
            latitude: 22.6,
            longitude: 114.2,
          },
          {
            id: "map-location-2",
            name: "塘朗山",
            region,
            latitude: 22.7,
            longitude: 114.0,
          },
        ],
      },
    }),
  );
  await page.route(
    "**/api/regions?countryCode=CN&level=province&serviceEnabled=false",
    (route) =>
      route.fulfill({
        json: {
          success: true,
          regions: [{ id: "province-gd", name: "广东省" }],
        },
      }),
  );
}

async function captureMap(
  page: import("@playwright/test").Page,
  map: import("@playwright/test").Locator,
  path: string,
) {
  await page.setViewportSize({
    width: page.viewportSize()!.width,
    height: 1600,
  });
  await map.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      map.evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      ),
    )
    .toBe(0);
  await map.screenshot({ path });
}

for (const width of [320, 768, 1024, 1440]) {
  test(`map previews remain stable with keyboard selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockMap(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/?mapProvince=广东省#map");
    const map = page.getByTestId("home-map-section");
    const first = map.getByRole("button", { name: "梧桐山", exact: true });
    await expect(first).toBeVisible();
    const box = await first.boundingBox();
    expect(box?.width).toBeCloseTo(44, 0);
    expect(box?.height).toBeCloseTo(44, 0);
    const preview = map.getByTestId("map-preview");
    const initialHeight = (await preview.boundingBox())!.height;
    await first.focus();
    await first.press("Enter");
    const link = preview.getByRole("link", { name: "查看地点" });
    await expect(link).toHaveAttribute("href", "/locations/map-location-1");
    const historyLength = await page.evaluate(() => history.length);
    await map
      .getByRole("button", { name: "塘朗山", exact: true })
      .press("Enter");
    await expect(link).toHaveAttribute("href", "/locations/map-location-2");
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    expect((await preview.boundingBox())!.height).toBeCloseTo(initialHeight, 0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await captureMap(page, map, `.wrangler/map-screenshots/map-${width}.png`);
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    await expect(link).toHaveAttribute("href", "/locations/map-location-2");
    await map.getByRole("button", { name: "返回全国地图" }).click();
    await expect(
      map.getByRole("button", { name: "广东省", exact: true }),
    ).toBeFocused();
    await expect(page).not.toHaveURL(/mapProvince|mapLocation/);
    expect(errors).toEqual([]);
  });
}

test.describe("touch exploration", () => {
  test.use({ hasTouch: true });
  test("touching dense points offers named choices and returning from details restores the preview and scroll", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await mockMap(page);
    await page.route("**/locations/map-location-*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Location detail</title><h1>Location detail</h1>",
      }),
    );
    await page.goto("/#map");
    const map = page.getByTestId("home-map-section");
    const point = map.getByRole("button", { name: "梧桐山", exact: true });
    await point.scrollIntoViewIfNeeded();
    const preview = map.getByTestId("map-preview");
    const previewHeight = (await preview.boundingBox())!.height;
    const box = (await point.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(
      preview.getByRole("button", { name: "梧桐山 · 深圳", exact: true }),
    ).toBeVisible();
    expect((await preview.boundingBox())!.height).toBeCloseTo(previewHeight, 0);
    await preview
      .getByRole("button", { name: "梧桐山 · 深圳", exact: true })
      .click();
    const link = preview.getByRole("link", { name: "查看地点" });
    await expect(link).toHaveAttribute("href", "/locations/map-location-1");
    await link.scrollIntoViewIfNeeded();
    const scrollY = await page.evaluate(() => window.scrollY);
    await link.click();
    await expect(page).toHaveURL(/\/locations\/map-location-1$/);
    await page.goBack();
    await expect(link).toHaveAttribute("href", "/locations/map-location-1");
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeCloseTo(scrollY, 0);
    await page.mouse.wheel(0, 100);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrollY);
    expect(
      await page.evaluate(() => document.documentElement.style.overflowAnchor),
    ).toBe("");
  });
});

test("map failure is retryable and reduced motion updates without animation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await mockMap(page);
  let attempts = 0;
  await page.route("**/maps/china-provinces.svg", (route) =>
    ++attempts === 1
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.continue(),
  );
  await page.goto("/?mapProvince=广东省#map");
  const map = page.getByTestId("home-map-section");
  await map.getByRole("button", { name: "重新加载" }).click();
  await map.getByRole("button", { name: "梧桐山", exact: true }).press("Enter");
  await expect(map.getByRole("link", { name: "查看地点" })).toHaveAttribute(
    "href",
    "/locations/map-location-1",
  );
  expect(
    await map.evaluate(
      (element) =>
        element
          .getAnimations({ subtree: true })
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  await captureMap(
    page,
    map,
    ".wrangler/map-screenshots/map-reduced-motion.png",
  );
});

for (const [locale, linkName] of [
  ["en", "View location"],
]) {
  test(`map preview supports ${locale} at 320px`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page
      .context()
      .addCookies([{ name: "gomate_locale", value: locale, url: baseURL! }]);
    await mockMap(page);
    await page.goto("/?mapProvince=广东省&mapLocation=map-location-1#map");
    const map = page.getByTestId("home-map-section");
    await expect(map.getByRole("link", { name: linkName })).toHaveAttribute(
      "href",
      "/locations/map-location-1",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await captureMap(page, map, `.wrangler/map-screenshots/map-${locale}.png`);
  });
}

test("camera and fixed-size markers stay aligned through an interrupted zoom", async ({
  page,
}) => {
  await mockMap(page);
  await page.goto("/#map");
  const map = page.getByTestId("home-map-section");
  await expect(
    map.getByRole("button", { name: "梧桐山", exact: true }),
  ).toBeVisible();
  await map.scrollIntoViewIfNeeded();
  const sampling = page.evaluate(async () => {
    const projected = new DOMPoint(
      ((114.2 - 73) / (136 - 73)) * 800,
      ((54 - 22.6) / (54 - 17)) * 620,
    );
    let maxDrift = 0;
    let samples = 0;
    for (let frame = 0; frame < 35; frame++) {
      await new Promise(requestAnimationFrame);
      const camera = document.querySelector<SVGGraphicsElement>(
        '[data-testid="map-content"]',
      )!;
      const marker = document.querySelector<HTMLButtonElement>(
        '[data-map-point="map-location-1"]',
      )!;
      const expected = projected.matrixTransform(camera.getScreenCTM()!);
      const box = marker.getBoundingClientRect();
      maxDrift = Math.max(
        maxDrift,
        Math.hypot(
          box.x + box.width / 2 - expected.x,
          box.y + box.height / 2 - expected.y,
        ),
      );
      samples++;
    }
    return { maxDrift, samples };
  });
  await map.getByRole("button", { name: "广东省", exact: true }).press("Enter");
  const back = map.getByRole("button", { name: "返回全国地图" });
  await expect(back).toBeFocused();
  await page.evaluate(async () => {
    for (let frame = 0; frame < 4; frame++)
      await new Promise(requestAnimationFrame);
  });
  await back.click();
  const result = await sampling;
  expect(result.samples).toBeGreaterThan(20);
  expect(result.maxDrift).toBeLessThan(1);
  await expect(map.getByTestId("map-content")).toHaveAttribute(
    "transform",
    "matrix(1 0 0 1 0 0)",
  );
  await expect(
    map.getByRole("button", { name: "广东省", exact: true }),
  ).toBeFocused();
});
