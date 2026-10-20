import type { ActivityType, RecruitmentStatus } from "@/contracts";
import { isActivityType } from "./activity-types";
import { getDateRangeByQuickType } from "./date-beijing";

const MAX_FILTER_VALUES = 20;
const MAX_FILTER_VALUE_LENGTH = 64;

export function parseTeamTagFilters(value: string | null): string[] {
  if (!value) return [];
  return [...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= MAX_FILTER_VALUE_LENGTH),
  )].slice(0, MAX_FILTER_VALUES);
}


export interface TeamFilters {
  searchQuery: string;
  selectedActivityType: ActivityType | "";
  selectedRecruitmentStatus: RecruitmentStatus | "";
  selectedRegionId: string;
  startDate: string;
  endDate: string;
  selectedTags: string[];
}

export function parseTeamFilters(params: URLSearchParams): TeamFilters {
  const activityType = params.get("activityType");
  const status = params.get("recruitmentStatus");
  const range = getDateRangeByQuickType(params.get("timeFilter") || "");
  return {
    searchQuery: (params.get("q") || "").slice(0, 120),
    selectedRegionId: (params.get("regionId") || "").slice(0, 64),
    selectedActivityType: isActivityType(activityType) ? activityType : "",
    selectedRecruitmentStatus: status === "all" ? "" : status === "closed" ? "closed" : "open",
    selectedTags: parseTeamTagFilters(params.get("tags")),
    startDate: range?.start || params.get("startDate") || "",
    endDate: range?.end || params.get("endDate") || "",
  };
}

export function buildTeamListQuery(filters: TeamFilters, cursor?: string | null): URLSearchParams {
  const query = new URLSearchParams({ limit: "12" });
  if (cursor) query.set("cursor", cursor);
  if (filters.searchQuery) query.set("search", filters.searchQuery);
  if (filters.selectedActivityType) query.set("activityType", filters.selectedActivityType);
  if (filters.selectedRecruitmentStatus) query.set("recruitmentStatus", filters.selectedRecruitmentStatus);
  if (filters.selectedRegionId) query.set("regionId", filters.selectedRegionId);
  if (filters.startDate) query.set("startDateFrom", filters.startDate);
  if (filters.endDate) query.set("startDateTo", filters.endDate);
  if (filters.selectedTags.length) query.set("tagIds", filters.selectedTags.join(","));
  return query;
}
