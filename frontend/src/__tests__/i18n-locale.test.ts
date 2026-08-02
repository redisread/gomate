import { describe, expect, it } from "vitest";
import { getLocaleFromCookie, getLocaleName, SUPPORTED_LOCALES } from "../i18n";

describe("locale support", () => {
  it("keeps the Japanese locale aligned with the checked-in locale resources", () => {
    expect(SUPPORTED_LOCALES).toContain("ja");
    expect(getLocaleFromCookie("gomate_locale=ja")).toBe("ja");
    expect(getLocaleName("ja")).toBe("日本語");
  });
});
