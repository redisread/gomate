import { expect, test } from "@playwright/test";

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
  expect(observedTransforms).not.toContainEqual(expect.stringMatching(/^matrix\(3 /u));
  expect(observedTransforms.at(-1)).toBe(finalTransform);
});
