/**
 * P1-1 T2 (task #188) — 引导流类型定义
 * spec: notes/gomate-p1-1-onboarding-spec.md v1.2 §9.3
 */

export interface OnboardingCandidate {
  id: string;
  title: string;
  activityType: PreferenceType;
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
