export { getQuickRegions, getDisplayedQuickRegions } from "@/components/shared/quick-city-options";

export const TEAM_DATE_OPTIONS = [
  { key: "today", labelKey: "filter.dateQuickToday" },
  { key: "tomorrow", labelKey: "filter.dateQuickTomorrow" },
  { key: "weekend", labelKey: "filter.dateQuickWeekend" },
  { key: "7days", labelKey: "filter.dateQuick7Days" },
  { key: "30days", labelKey: "filter.dateQuick30Days" },
] as const;
