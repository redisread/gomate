import { describe, expect, it } from "vitest";
import { resolvePageMetadata } from "./page-metadata";
import { getSSRT } from "@/i18n";
import en from "../../public/locales/en/content.json";
import zh from "../../public/locales/zh-CN/content.json";

describe("page metadata", () => {
  for (const [locale, content] of [
    ["en", en],
    ["zh-CN", zh],
  ] as const) {
    const { t } = getSSRT(locale, { [locale]: { content } });
    it(`resolves explicit titles and default descriptions in ${locale}`, () => {
      expect(
        resolvePageMetadata({ titleKey: "content.seo_pages.login" }, t),
      ).toEqual({
        title: content.seo_pages.login,
        description: content.description,
      });
      expect(resolvePageMetadata({}, t).title).toBe(content.title);
    });
    it(`preserves user titles even when they match old translation triggers in ${locale}`, () => {
      expect(
        resolvePageMetadata(
          { title: "登录 - GoMate", description: "User content" },
          t,
        ),
      ).toEqual({
        title: `登录 - GoMate${content.titleSuffix}`,
        description: "User content",
      });
    });
  }
});
