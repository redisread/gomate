import type { City } from "@/lib/types";

export const TEAM_DATE_OPTIONS = [
  { key: "today", labelKey: "filter.dateQuickToday" },
  { key: "tomorrow", labelKey: "filter.dateQuickTomorrow" },
  { key: "weekend", labelKey: "filter.dateQuickWeekend" },
  { key: "7days", labelKey: "filter.dateQuick7Days" },
  { key: "30days", labelKey: "filter.dateQuick30Days" },
] as const;

const HOT_CITY_PRIORITY = ["深圳", "广州", "香港", "昆明", "长沙", "成都"];

export function getQuickCities(cities: City[], limit: number): City[] {
  return cities
    .filter((city) => city.isHot)
    .sort((left, right) => {
      const leftRank = HOT_CITY_PRIORITY.indexOf(left.name);
      const rightRank = HOT_CITY_PRIORITY.indexOf(right.name);
      if (leftRank !== -1 || rightRank !== -1) {
        if (leftRank === -1) return 1;
        if (rightRank === -1) return -1;
        return leftRank - rightRank;
      }
      return left.name.localeCompare(right.name, "zh-CN");
    })
    .slice(0, limit);
}
