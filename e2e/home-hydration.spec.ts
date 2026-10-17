import { expect, test } from "@playwright/test";
import { createTeamAs, getFirstLocationId, patchWechat, signUpUser } from "./fixtures";

const runId = `${Date.now()}-${process.pid}`;
let teamId: string;
let expectedLocalTime: string;

test.beforeAll(async () => {
  const user = await signUpUser(`home-time-${runId}@e2e.gomate.test`, "TestPass123!", "Home time");
  await patchWechat(user, `home${runId}`);
  const start = Date.now() + 3_600_000;
  expectedLocalTime = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(start);
  teamId = await createTeamAs(user, {
    locationId: await getFirstLocationId(), activityType: "hiking", title: `Home time ${runId}`,
    startAt: new Date(start).toISOString(), endAt: new Date(start + 3_600_000).toISOString(), maxParticipants: 5,
  });
});

for (const locale of ["zh-CN", "en"]) {
  test(`home hydrates populated departure cards in ${locale} across time zones`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale, timezoneId: "America/New_York" });
    await context.addCookies([{ name: "gomate_locale", value: locale, url: baseURL! }]);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(`${baseURL}${locale === "en" ? "/en" : "/"}`);
    // This must be a genuine SSR team, not a fixture added only after hydration.
    expect(await response!.text()).toContain(`href="/teams/${teamId}"`);
    await expect(page.locator(`[data-testid="guest-departure-board"] a[href="/teams/${teamId}"]`)).toBeVisible();
    await expect(page.locator(`[data-testid="guest-departure-board"] a[href="/teams/${teamId}"]`)).toContainText(expectedLocalTime);
    await expect(page.locator(".home-hero-title")).not.toHaveText("");
    await page.getByTestId("guest-departure-board").scrollIntoViewIfNeeded();
    expect(errors).toEqual([]);
    await context.close();
  });
}
