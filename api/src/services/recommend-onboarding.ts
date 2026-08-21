import type { ActivityType } from "@gomate/types";
import { and, asc, desc, eq, gt, isNull, lte, sql, type SQL } from "drizzle-orm";
import type { createDb } from "../db";
import * as schema from "../db/schema";
import { activeTeamMemberCount } from "../lib/team-participant-count";

type Db = ReturnType<typeof createDb>;

export const DEFAULT_ONBOARDING_REGION_ID = "region-cn-shenzhen";
const WINDOW_DAYS = 14;
const CANDIDATE_LIMIT = 20;

export interface RecommendOnboardingCandidate {
  id: string;
  title: string;
  activityType: ActivityType;
  startAt: Date;
  maxParticipants: number;
  activeParticipantCount: number;
  locationName: string;
  regionName: string;
  coverImageUrl: string;
}

export interface RecommendOnboardingResult {
  hasAnyMembership: boolean;
  candidates: RecommendOnboardingCandidate[];
  fallbackNoType: boolean;
  regionId: string;
}

export async function getRecommendOnboarding(params: {
  db: Db;
  userId: string;
  regionId?: string | null;
  activityType?: ActivityType | null;
  now?: Date;
}): Promise<RecommendOnboardingResult> {
  const { db, userId } = params;
  const regionId = params.regionId || DEFAULT_ONBOARDING_REGION_ID;
  const activityType = params.activityType ?? null;
  const now = params.now ?? new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1_000);

  const membershipRows = await db
    .select({
      hasAnyMembership: sql<number>`case when
        exists (
          select 1 from ${schema.teams} as led_team
          where led_team.leader_id = ${userId}
        )
        or exists (
          select 1 from ${schema.teamMembers} as active_membership
          where active_membership.user_id = ${userId}
            and active_membership.left_at is null
        )
        or exists (
          select 1 from ${schema.teamJoinRequests} as pending_request
          where pending_request.user_id = ${userId}
            and pending_request.status = 'pending'
        )
        then 1 else 0 end`,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  const hasAnyMembership = Boolean(membershipRows[0]?.hasAnyMembership);

  const queryCandidates = async (filterActivityType: ActivityType | null) => {
    const activeParticipantCount = activeTeamMemberCount(schema.teams.id);
    const filters: SQL[] = [
      eq(schema.locations.regionId, regionId),
      eq(schema.locations.status, "published"),
      eq(schema.teams.recruitmentStatus, "open"),
      isNull(schema.teams.formedAt),
      isNull(schema.teams.cancelledAt),
      gt(schema.teams.startAt, now),
      lte(schema.teams.startAt, windowEnd),
      sql`${activeParticipantCount} < ${schema.teams.maxParticipants}`,
    ];
    if (filterActivityType) {
      filters.push(eq(schema.teams.activityType, filterActivityType));
    }

    return db
      .select({
        id: schema.teams.id,
        title: schema.teams.title,
        activityType: schema.teams.activityType,
        startAt: schema.teams.startAt,
        maxParticipants: schema.teams.maxParticipants,
        activeParticipantCount,
        locationName: schema.locations.name,
        regionName: schema.region.name,
        coverImageUrl: schema.locations.coverImageUrl,
      })
      .from(schema.teams)
      .innerJoin(schema.locations, eq(schema.locations.id, schema.teams.locationId))
      .innerJoin(schema.region, eq(schema.region.id, schema.locations.regionId))
      .where(and(...filters))
      .orderBy(
        asc(schema.teams.startAt),
        desc(activeParticipantCount),
        asc(schema.teams.id),
      )
      .limit(CANDIDATE_LIMIT);
  };

  let candidates = await queryCandidates(activityType);
  let fallbackNoType = false;
  if (activityType && candidates.length === 0) {
    candidates = await queryCandidates(null);
    fallbackNoType = candidates.length > 0;
  }

  return { hasAnyMembership, candidates, fallbackNoType, regionId };
}
