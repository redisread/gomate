import { z } from "zod";
import { ActivityTypeSchema } from "./enums";

export const topLocationSchema = z.object({
  locationId: z.string(),
  locationName: z.string(),
  coverImageUrl: z.string(),
  visitScore: z.number(),
  uniqueVisitors: z.number(),
});
export const neighborTeamSchema = z.object({
  teamId: z.string(),
  title: z.string(),
  activityType: ActivityTypeSchema,
  locationName: z.string(),
  startAt: z.string(),
  neighborCount: z.number(),
  neighborAvatars: z.array(z.string()),
});
export const publicLocalCircleSchema = z.object({
  regionId: z.string(),
  regionName: z.string(),
  activePeopleCount: z.number(),
  topLocations: z.array(topLocationSchema),
});
export const localCircleSchema = publicLocalCircleSchema.extend({
  neighborTeams: z.array(neighborTeamSchema),
});
export type TopLocation = z.infer<typeof topLocationSchema>;
export type NeighborTeam = z.infer<typeof neighborTeamSchema>;
export type PublicLocalCircle = z.infer<typeof publicLocalCircleSchema>;
export type LocalCircle = z.infer<typeof localCircleSchema>;
