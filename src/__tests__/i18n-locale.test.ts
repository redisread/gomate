import { describe, expect, it } from "vitest";
import {
  getLocaleFromCookie,
  getLocaleName,
  getSSRT,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "../i18n";
import { localesData } from "../i18n/locales-data";

describe("locale support", () => {
  it.each([
    [undefined, "zh-CN"],
    ["", "zh-CN"],
    ["invalid", "zh-CN"],
    ["en", "en"],
    ["ja", "ja"],
  ])("resolves %s to the supported locale %s", (value, expected) => {
    expect(resolveLocale(value)).toBe(expected);
  });

  it("keeps the administrator location title translated when the request locale is missing", () => {
    const locale = resolveLocale(undefined);
    const ssr = getSSRT(locale, {
      [locale]: { admin: localesData[locale].admin },
    });

    expect(ssr.t("admin.locationsManagement.title")).toBe("地点管理");
  });

  it("keeps the Japanese locale aligned with the checked-in locale resources", () => {
    expect(SUPPORTED_LOCALES).toContain("ja");
    expect(getLocaleFromCookie("gomate_locale=ja")).toBe("ja");
    expect(getLocaleName("ja")).toBe("日本語");
  });

  it.each([
    ["zh-CN", "地点", "活动开始时间"],
    ["en", "Location", "Activity Start Time"],
    ["ja", "場所", "アクティビティ開始時間"],
  ])("uses activity-neutral team form labels in %s", (locale, locationLabel, startTimeLabel) => {
    const teams = localesData[locale]?.teams as {
      formLabel?: { location?: string; startTime?: string };
    };
    expect(teams.formLabel?.location).toBe(locationLabel);
    expect(teams.formLabel?.startTime).toBe(startTimeLabel);
  });
});
