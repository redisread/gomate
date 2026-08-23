import { ACTIVITY_TYPES, type ActivityType } from "@/contracts";

export function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" &&
    (ACTIVITY_TYPES as readonly string[]).includes(value);
}

export function orderActivityTypesForLocation(
  activityTypes: readonly ActivityType[],
  recommendedIds: readonly ActivityType[],
): ActivityType[] {
  const recommended = new Set(recommendedIds);
  return [
    ...activityTypes.filter((id) => recommended.has(id)),
    ...activityTypes.filter((id) => !recommended.has(id)),
  ];
}
