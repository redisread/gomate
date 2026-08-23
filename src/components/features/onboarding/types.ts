import type { ActivityType } from "@/contracts";

/**
 * 首次引导流类型定义。
 */

export interface OnboardingCandidate {
  id: string;
  title: string;
  activityType: ActivityType;
  activityTypeName: string;
  startAt: string;
  maxParticipants: number;
  activeParticipantCount: number;
  locationName: string;
  regionName: string;
  coverImageUrl: string;
}

export interface RecommendOnboardingResponse {
  hasAnyMembership: boolean;
  candidates: OnboardingCandidate[];
  fallbackNoType: boolean;
  regionId: string;
}

export type PreferenceType = "hiking" | "explore" | "leisure" | "travel";
