import type { TeamLifecycle } from "@/contracts";
import { and, gt, isNotNull, isNull, lte, type SQL } from "drizzle-orm";
import * as schema from "../db/schema";

export function lifecycleCondition(lifecycle: TeamLifecycle, now: Date): SQL {
  switch (lifecycle) {
    case "cancelled":
      return isNotNull(schema.teams.cancelledAt);
    case "pending":
      return and(
        isNull(schema.teams.cancelledAt),
        isNull(schema.teams.formedAt),
        gt(schema.teams.startAt, now),
      )!;
    case "formed":
      return and(
        isNull(schema.teams.cancelledAt),
        isNotNull(schema.teams.formedAt),
        gt(schema.teams.startAt, now),
      )!;
    case "in_progress":
      return and(
        isNull(schema.teams.cancelledAt),
        isNotNull(schema.teams.formedAt),
        lte(schema.teams.startAt, now),
        gt(schema.teams.endAt, now),
      )!;
    case "completed":
      return and(
        isNull(schema.teams.cancelledAt),
        isNotNull(schema.teams.formedAt),
        lte(schema.teams.endAt, now),
      )!;
    case "expired_unformed":
      return and(
        isNull(schema.teams.cancelledAt),
        isNull(schema.teams.formedAt),
        lte(schema.teams.startAt, now),
      )!;
  }
}
