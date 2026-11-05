import { expect, test } from "@playwright/test";
import { createLocalVerificationToken, getFirstLocationId } from "./fixtures";
import { fillLoginForm } from "./helpers";

for (const locale of ["zh-CN", "en"]) {
  test(`${locale}: registration in a new tab returns to the selected place and contact setup preserves the activity`, async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(60_000);
    await context.addCookies([
      { name: "gomate_locale", value: locale, url: baseURL! },
    ]);
    const locationId = await getFirstLocationId();
    const prefix = locale === "en" ? "/en" : "";
    const target = `${prefix}/teams/create?locationId=${locationId}`;
    await page.goto(target);
    await page.waitForURL(/\/login\?/);
    const register = page.getByRole("link", { name: /立即注册|Sign up now/i });
    await expect(register).toBeVisible();
    expect(
      new URL((await register.getAttribute("href"))!, baseURL).searchParams.get(
        "returnTo",
      ),
    ).toBe(target);
    await register.click();
    await page.waitForLoadState("networkidle");
    const email = `continuity-${locale}-${Date.now()}@e2e.gomate.test`;
    await page.getByTestId("register-name").fill("Activity organizer");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill("test1234");
    await page.getByTestId("register-confirm-password").fill("test1234");
    const registration = page.waitForResponse("**/api/auth/sign-up/email");
    await page.getByTestId("register-submit").click();
    const registered = await registration;
    expect(registered.ok()).toBe(true);
    expect(registered.request().postDataJSON().callbackURL).toBe(target);
    await expect(
      page.getByRole("heading", { name: /注册成功|Registration Successful/ }),
    ).toBeVisible();

    const token = await createLocalVerificationToken(email);
    const verifiedPage = await context.newPage();
    await page.close();
    await verifiedPage.goto(
      `${prefix}/verify-email#${new URLSearchParams({ token, returnTo: target })}`,
    );
    const confirm = verifiedPage.getByRole("button", {
      name: /确认验证邮箱|Verify my email|确认邮箱|Confirm email/i,
    });
    await expect(confirm).toBeVisible();
    expect(new URL(verifiedPage.url()).hash).toBe("");
    const confirmation = verifiedPage.waitForResponse(
      "**/api/auth/confirm-email",
    );
    await confirm.click();
    expect((await confirmation).ok()).toBe(true);
    await verifiedPage
      .getByRole("link", { name: /去登录|Go to login|Go to sign in|前往登录/i })
      .click();
    await fillLoginForm(verifiedPage, email, "test1234");
    await verifiedPage.getByTestId("login-submit").click();
    await verifiedPage.waitForURL(
      (url) =>
        url.pathname === `${prefix}/teams/create` &&
        url.searchParams.get("locationId") === locationId,
    );
    await verifiedPage
      .getByTestId("create-team-title")
      .fill(`A day out ${locale}`);
    await verifiedPage
      .getByTestId("create-team-activity-type")
      .selectOption("hiking");
    await verifiedPage
      .getByTestId("create-team-description")
      .fill("Meet for a walk by the lake.");

    let firstAttempt = true;
    await verifiedPage.route("**/api/users/me", async (route) => {
      if (route.request().method() === "PATCH" && firstAttempt) {
        firstAttempt = false;
        await route.fulfill({ status: 503, json: { success: false } });
      } else await route.continue();
    });
    await verifiedPage
      .getByLabel(/微信号|WeChat ID/, { exact: true })
      .fill("organizer-contact");
    const saveContact = verifiedPage.getByRole("button", {
      name: /保存微信号|Save WeChat ID/,
    });
    await saveContact.click();
    await expect(verifiedPage.getByRole("alert")).toBeVisible();
    await expect(verifiedPage.getByTestId("create-team-title")).toHaveValue(
      `A day out ${locale}`,
    );
    await saveContact.click();
    await expect(saveContact).toHaveCount(0);
    await expect(verifiedPage.getByTestId("create-team-title")).toBeFocused();
    await expect(
      verifiedPage.getByTestId("create-team-activity-type"),
    ).toHaveValue("hiking");
    await verifiedPage
      .getByTestId("create-team-date")
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await verifiedPage.getByTestId("create-team-time").fill("09:00");
    await verifiedPage.getByTestId("create-team-max-members").fill("4");
    await verifiedPage.getByTestId("create-team-submit").click();
    await verifiedPage.waitForURL(/\/teams\/(?!create)[^/?]+$/);
    await expect(verifiedPage.getByRole("heading", { level: 1 })).toHaveText(
      `A day out ${locale}`,
    );
    await expect(
      verifiedPage.getByRole("button", { name: /确认出发|Confirm departure/ }),
    ).toBeVisible();
    await verifiedPage.close();
  });
}
