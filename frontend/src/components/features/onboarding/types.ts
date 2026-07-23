/**
 * P1-1 T2 (task #188) — 引导流类型定义
 * spec: notes/gomate-p1-1-onboarding-spec.md v1.2 §9.3
 */

export interface OnboardingCandidate {
  id: string;
  title: string;
  icon: string | null;
  startTime: string;
  maxMembers: number;
  approvedCount: number;
  locationName: string;
  cityName: string;
  locationType: string | null;
}

export interface RecommendOnboardingResponse {
  hasAnyMembership: boolean;
  candidates: OnboardingCandidate[];
  fallbackNoType: boolean;
  cityId: string | null;
}

export type PreferenceType = "hiking" | "explore" | "leisure" | "travel";
