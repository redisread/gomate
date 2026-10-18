import { expect, test } from "@playwright/test";

test("theme menu persists the selected mode and restores keyboard focus", async ({ page }) => {
  await page.goto("/en/locations");
  const selector = page.locator("[data-theme-toggle]").filter({ visible: true }).first();
  const trigger = selector.getByRole("button", { name: "Toggle Theme" });
  await trigger.click();
  await selector.getByRole("menuitemradio", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("mobile controls retain readable sizing and drawer focus under reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/zh-CN/login");
  const email = page.getByTestId("login-email");
  await expect(email).toBeVisible();
  expect(
    await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  await page.goto("/zh-CN/locations");
  const trigger = page.getByTestId("nav-mobile-menu-toggle");
  await trigger.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("Tab");
    expect(
      await drawer.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("language dropdown supports keyboard dismissal and restores its trigger", async ({
  page,
}) => {
  await page.goto("/zh-CN/locations");
  const selector = page
    .locator("[data-locale-toggle]")
    .filter({ visible: true })
    .first();
  const trigger = selector.getByRole("button", { name: "中文", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  await expect(selector.getByRole("menuitemradio")).toHaveCount(2);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(selector.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("profile radio cards serialize the keyboard-selected level", async ({
  page,
}) => {
  await page.route("**/api/users/me", (route) =>
    route.fulfill({
      json: {
        success: true,
        user: {
          id: "starwind-profile",
          name: "Member",
          nickname: "Member",
          email: "member@example.com",
          image: null,
          extra: { level: "beginner" },
        },
      },
    }),
  );
  await page.goto("/zh-CN/profile/edit");
  const group = page.getByRole("radiogroup");
  const radios = group.getByRole("radio");
  await expect(radios).toHaveCount(4);
  await radios.first().focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeChecked();
  const value = await group.evaluate((el) =>
    new FormData(el.closest("form")!).get("level"),
  );
  expect(value).toBe("intermediate");
  await expect(radios.first()).not.toBeChecked();
});

for (const form of ["login", "register"]) {
  test(`${form} password text stays clear of the visibility button`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/zh-CN/${form}`);
    const input = page.getByTestId(`${form}-password`);
    await input.fill("a-long-password-for-checking-the-text-edge");
    const bounds = await input.evaluate((element) => {
      const field = element.getBoundingClientRect();
      const toggle = element.parentElement!.querySelector("button")!.getBoundingClientRect();
      return { textRight: field.right - parseFloat(getComputedStyle(element).paddingRight), toggleLeft: toggle.left, toggleWidth: toggle.width };
    });
    expect(bounds.textRight).toBeLessThanOrEqual(bounds.toggleLeft);
    expect(bounds.toggleWidth).toBeGreaterThanOrEqual(44);
  });
}

test("location filter footer keeps hint and clear action in one row", async ({ page }) => {
  await page.goto("/zh-CN/locations");
  const hint = page.locator("#locations-interest-hint");
  const positions = await hint.evaluate((element) => {
    const hintBox = element.getBoundingClientRect();
    const button = element.parentElement!.querySelector("button")!.getBoundingClientRect();
    return { hintRight: hintBox.right, buttonLeft: button.left, hintCenter: hintBox.y + hintBox.height / 2, buttonCenter: button.y + button.height / 2 };
  });
  expect(positions.hintRight).toBeLessThanOrEqual(positions.buttonLeft);
  expect(positions.hintCenter).toBeCloseTo(positions.buttonCenter, 0);
});
