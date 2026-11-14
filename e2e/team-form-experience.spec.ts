import { test, expect, type Page } from "@playwright/test";
import { loginAs } from "./helpers";
import {
  createTeamAs,
  getFirstLocationId,
  patchWechat,
  signUpUser,
} from "./fixtures";

async function checkLayout(page: Page) {
  for (const width of [320, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const actions = page.getByTestId("team-form-actions");
    await expect(actions).toHaveCSS(
      "position",
      width < 640 ? "fixed" : "static",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const controls = page
      .getByTestId("team-form")
      .locator("input:visible, select:visible, textarea:visible");
    for (const control of await controls.all()) {
      await expect(control).toHaveAccessibleName(/.+/u);
      expect(
        await control.evaluate((element) =>
          parseFloat(getComputedStyle(element).fontSize),
        ),
      ).toBeGreaterThanOrEqual(16);
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      if (
        ["date", "time"].includes((await control.getAttribute("type")) ?? "")
      ) {
        expect((await control.boundingBox())!.width).toBeGreaterThanOrEqual(
          150,
        );
      }
      if (await control.evaluate((element) => element.tagName === "SELECT")) {
        await expect(control).toHaveCSS("padding-right", "36px");
      }
    }
  }
}

for (const locale of ["zh-CN", "en"]) {
  test(`${locale} compact forms retain data, support keyboard and adapt across widths`, async ({
    page,
    browserName,
  }, testInfo) => {
    test.setTimeout(60_000);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    const run = `${Date.now()}-${locale}`;
    const user = await signUpUser(
      `form-${run}@e2e.gomate.test`,
      "test1234",
      "Form tester",
    );
    await patchWechat(user, "form-contact");
    const locationId = await getFirstLocationId();
    const start = Date.now() + 7 * 86400000;
    const teamId = await createTeamAs(user, {
      locationId,
      activityType: "hiking",
      title: "周末一起出发 · Weekend walk",
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 90 * 60_000).toISOString(),
      maxParticipants: 6,
      description: "轻松走走，沿途休息，期待遇见新朋友。",
      requirements: ["穿舒适的鞋子"],
    });
    await page.context().addCookies([
      {
        name: "gomate_locale",
        value: locale,
        url: process.env.E2E_BASE_URL || "http://localhost:5432",
      },
    ]);
    await loginAs(page, user.email, user.password);
    await page.goto(`/teams/create?locationId=${locationId}`);
    const form = page.getByTestId("team-form");
    const title = page.getByTestId("create-team-title");
    await expect(title).toBeVisible();
    await expect(page.getByTestId("create-team-activity-type")).toBeEnabled();
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    const extra = page.getByRole("button", {
      name: /补充信息|Additional details/u,
    });
    const panel = page.locator(".team-form-extra");
    await expect(extra).toHaveAttribute("aria-expanded", "false");
    await expect(panel).toHaveAttribute("inert", "");
    await extra.focus();
    await page.keyboard.press(
      browserName === "webkit" && process.platform === "darwin"
        ? "Alt+Tab"
        : "Tab",
    );
    await expect(
      page.getByRole("button", { name: /取消|Cancel/u, exact: true }),
    ).toBeFocused();
    await extra.click();
    await page.locator('[name="meetingPoint"]').fill("南门入口 · South gate");
    await extra.click();
    await extra.click();
    await expect(page.locator('[name="meetingPoint"]')).toHaveValue(
      "南门入口 · South gate",
    );
    // Interrupt motion and switch reduced-motion while closing.
    await extra.evaluate((element: HTMLElement) => element.click());
    await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
    await expect(panel).toBeHidden();
    await extra.click();
    await expect(panel).toHaveCSS("animation-name", "none");
    await expect(page.locator('[name="meetingPoint"]')).toHaveValue(
      "南门入口 · South gate",
    );
    await extra.click();
    await checkLayout(page);
    await page.emulateMedia({
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    await title.fill("周末一起出发 · Weekend walk");
    await page.getByTestId("create-team-activity-type").selectOption("hiking");
    await page.getByTestId("create-team-max-members").fill("6");
    await page
      .getByTestId("create-team-date")
      .fill(new Date(start).toISOString().slice(0, 10));
    await page.getByTestId("create-team-time").fill("10:00");
    await page
      .getByTestId("create-team-description")
      .fill("轻松走走，沿途休息，期待遇见新朋友。");
    // Reselecting the current location must keep its details and activity choices.
    const picker = page.getByTestId("create-team-location");
    const name = await picker.locator("span.font-medium").innerText();
    await picker.click();
    await page.getByTestId("create-team-location-search").fill(name);
    await page
      .getByRole("option", { name: new RegExp(name, "u") })
      .first()
      .click();
    await expect(page.getByTestId("create-team-activity-type")).toBeEnabled();
    await expect(picker).toContainText(name);
    await expect(picker).toHaveAccessibleName(new RegExp(name, "u"));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath("create-desktop.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath("create-mobile.png"),
      fullPage: true,
    });
    const description = page.getByTestId("create-team-description");
    await description.focus();
    // Synthetic viewport resize exercises the keyboard geometry without claiming a physical keyboard test.
    await page.evaluate(() => {
      Object.defineProperties(window.visualViewport, {
        height: { configurable: true, value: 500 },
        offsetTop: { configurable: true, value: 20 },
      });
      window.visualViewport!.dispatchEvent(new Event("resize"));
    });
    const actions = page.getByTestId("team-form-actions");
    await expect(actions).toHaveCSS("bottom", "324px");
    await expect
      .poll(
        async () =>
          (await description.boundingBox())!.y +
            (await description.boundingBox())!.height <=
          (await actions.boundingBox())!.y,
      )
      .toBe(true);
    await page.getByTestId("create-team-submit").focus();
    await expect(actions).toHaveCSS("bottom", "324px");
    await page.evaluate(() => {
      Reflect.deleteProperty(window.visualViewport!, "height");
      Reflect.deleteProperty(window.visualViewport!, "offsetTop");
      window.visualViewport!.dispatchEvent(new Event("resize"));
    });
    await expect(actions).toHaveCSS("bottom", "0px");
    // A definite rejection keeps the editable form and its action-bar error.
    // Unknown 5xx outcomes use the locked recovery view, covered separately.
    await page.route("**/api/teams", (route) =>
      route.fulfill({
        status: 422,
        json: { success: false, error: { message: "Invalid request" } },
      }),
    );
    await page.getByTestId("create-team-submit").click();
    await expect(actions.getByRole("alert")).toBeVisible();
    await expect(title).toHaveValue("周末一起出发 · Weekend walk");
    await expect
      .poll(async () => {
        const padding = await page
          .locator(".team-form-page")
          .evaluate((element) =>
            parseFloat(getComputedStyle(element).paddingBottom),
          );
        return padding - (await actions.boundingBox())!.height;
      })
      .toBeGreaterThanOrEqual(24);
    await page.unroute("**/api/teams");
    await page.goto(`/teams/${teamId}/edit`);
    await expect(form.locator('[name="title"]')).toBeVisible();
    await expect(extra).toHaveAttribute("aria-expanded", "true");
    await expect(panel).toHaveCSS("animation-name", "none");
    await expect(form.locator('[name="durationMinutes"]')).toHaveValue("90");
    await checkLayout(page);
    await page.screenshot({
      path: testInfo.outputPath("edit-desktop.png"),
      fullPage: true,
    });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("html")).toHaveClass(/dark/u);
    const labelColor = await form
      .locator('label[for="title"]')
      .evaluate((element) => getComputedStyle(element).color);
    await expect(page.locator("h1")).toHaveCSS("color", labelColor);
    await expect(extra.locator(".font-semibold")).toHaveCSS(
      "color",
      labelColor,
    );
    await expect(form.locator('a[href^="/locations/"] .font-medium')).toHaveCSS(
      "color",
      labelColor,
    );
    await page.screenshot({
      path: testInfo.outputPath("edit-mobile-dark.png"),
      fullPage: true,
      animations: "disabled",
    });
    expect(browserErrors).toEqual([]);
  });
}
