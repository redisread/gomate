import { describe, expect, it } from "vitest";
import { getLocaleFromCookie, getLocaleName, SUPPORTED_LOCALES } from "../i18n";
import { localesData } from "../i18n/locales-data";

describe("locale support", () => {
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
