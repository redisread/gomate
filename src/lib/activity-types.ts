import type { ActivityType, ActivityTypeInfo } from "@/contracts";

export function orderActivityTypesForLocation(
  activityTypes: ActivityTypeInfo[],
  recommendedIds: ActivityType[],
): ActivityTypeInfo[] {
  const recommended = new Set(recommendedIds);
  return [
    ...activityTypes.filter(({ id }) => recommended.has(id)),
    ...activityTypes.filter(({ id }) => !recommended.has(id)),
  ];
}

export function activityTypeLabel(
  activityType: ActivityType,
  activityTypes: ActivityTypeInfo[],
): string {
  return activityTypes.find(({ id }) => id === activityType)?.name ?? activityType;
}
