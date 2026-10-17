import { ActivityTypeSchema, TeamSchema, TimestampSchema } from "./index";
import { z } from "zod";

export const TeamResponseSchema = z.object({
  success: z.literal(true),
  team: TeamSchema,
});
export const TeamListResponseSchema = z.object({
  success: z.literal(true),
  teams: z.array(TeamSchema),
  total: z.number(),
  nextCursor: z.string().nullable(),
});
export const TeamSuccessSchema = z.object({ success: z.literal(true) });
export const MyTeamStatusSchema = z.object({
  success: z.literal(true),
  status: z.enum(["leader", "member"]).nullable(),
});
export const OnboardingCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  activityType: ActivityTypeSchema,
  startAt: TimestampSchema,
  maxParticipants: z.number(),
  activeParticipantCount: z.number(),
  locationName: z.string(),
  regionName: z.string(),
  coverImageUrl: z.string(),
});
export type OnboardingCandidate = z.infer<typeof OnboardingCandidateSchema>;
export const OnboardingResponseSchema = z.object({
  hasAnyMembership: z.boolean(),
  fallbackNoType: z.boolean(),
  regionId: z.string(),
  candidates: z.array(OnboardingCandidateSchema),
});
export type RecommendOnboardingResponse = z.infer<
  typeof OnboardingResponseSchema
>;
export type TeamResponse = z.infer<typeof TeamResponseSchema>;
export type TeamListResponse = z.infer<typeof TeamListResponseSchema>;
export type TeamSuccess = z.infer<typeof TeamSuccessSchema>;
export type MyTeamStatus = z.infer<typeof MyTeamStatusSchema>;
