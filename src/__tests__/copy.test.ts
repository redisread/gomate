import { describe, expect, it } from "vitest";
import {
  ActivityTypeSchema,
  LocationStatusSchema,
  RecruitmentStatusSchema,
  SeasonSchema,
  TeamLifecycleSchema,
  UserGenderSchema,
  UserLevelSchema,
  UserRoleSchema,
  UserStatusSchema,
} from "@/contracts/enums";
import { getSSRT } from "../i18n";
import enEnums from "../../public/locales/en/enums.json";
import zhEnums from "../../public/locales/zh-CN/enums.json";
import enCommon from "../../public/locales/en/common.json";
import zhCommon from "../../public/locales/zh-CN/common.json";

// Read shipped catalogs, not a fixture that repeats the expected translations.
const catalogs = {
  "zh-CN": { enums: zhEnums, common: zhCommon },
  en: { enums: enEnums, common: enCommon },
};
const enumGroups = {
  locationType: ActivityTypeSchema.options,
  locationStatus: LocationStatusSchema.options,
  recruitmentStatus: RecruitmentStatusSchema.options,
  teamLifecycle: TeamLifecycleSchema.options,
  season: SeasonSchema.options,
  gender: UserGenderSchema.options,
  level: UserLevelSchema.options,
  leaderLevel: UserLevelSchema.options,
  levelDesc: UserLevelSchema.options,
  levelTitle: UserLevelSchema.options,
  userRole: UserRoleSchema.options,
  userStatus: UserStatusSchema.options,
};

for (const locale of ["zh-CN", "en"] as const) {
  describe(`shipped translations: ${locale}`, () => {
    it("provides a nonempty label for every public enum value without locale fallback", () => {
      const catalog: Record<string, Record<string, string>> = catalogs[locale].enums;
      for (const [group, values] of Object.entries(enumGroups)) {
        for (const value of values) {
          expect(catalog[group]?.[value], `${locale}: enums.${group}.${value}`)
            .toEqual(expect.stringMatching(/\S/));
        }
      }
    });

    it("interpolates the real catalog and retains placeholders when variables are omitted", () => {
      const { t } = getSSRT(locale, catalogs);
      expect(t("common.minutesAgo", { count: 5 })).toBe(
        locale === "en" ? "5 minutes ago" : "5分钟前",
      );
      expect(t("common.minutesAgo")).toBe(catalogs[locale].common.minutesAgo);
      expect(t("common.minutesAgo")).toContain("{count}");
    });
  });
}
