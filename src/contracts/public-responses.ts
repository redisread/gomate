import { z } from "@hono/zod-openapi";
import {
  TeamSchema,
  SessionUserSchema,
  TimestampSchema,
  UserPublicProfileSchema,
} from "./index";

export const SuccessSchema = z.object({ success: z.literal(true) });
export const SelfUserResponseSchema = SuccessSchema.extend({
  user: SessionUserSchema.extend({ updatedAt: TimestampSchema }),
});
export const TimelineTeamSchema = TeamSchema.omit({
  tags: true,
  leader: true,
  participants: true,
  location: true,
}).extend({
  location: z.object({
    id: z.string(),
    name: z.string(),
    coverImageUrl: z.string().nullable(),
  }),
});
export const TimelineTeamsResponseSchema = SuccessSchema.extend({
  teams: z.array(TimelineTeamSchema),
  nextCursor: z
    .string()
    .nullable()
    .describe("下一页游标；为 null 表示已到末页，客户端无需解析。"),
});
export const PublicUserResponseSchema = SuccessSchema.extend({
  user: UserPublicProfileSchema,
  ongoingTeams: z.array(
    TeamSchema.pick({
      id: true,
      title: true,
      activityType: true,
      startAt: true,
      endAt: true,
      maxParticipants: true,
      activeParticipantCount: true,
      recruitmentStatus: true,
      lifecycle: true,
    }).extend({
      location: z.object({
        id: z.string(),
        name: z.string(),
        coverImageUrl: z.string().nullable(),
      }),
    }),
  ),
});
