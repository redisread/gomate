import { z } from "@hono/zod-openapi";
import {
  LocationSchema,
  StorySchema,
  TeamSchema,
  SessionUserSchema,
  TeamJoinRequestSchema,
  TimestampSchema,
  UserPublicProfileSchema,
  ConversationSchema,
  MessageSchema,
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
  nextCursor: z.string().nullable(),
});
export const TimelineRequestsResponseSchema = SuccessSchema.extend({
  requests: z.array(
    TeamJoinRequestSchema.extend({
      team: z.object({ id: z.string(), title: z.string() }),
      teamTitle: z.string().optional(),
    }),
  ),
  nextCursor: z.string().nullable(),
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
// Favorite endpoints expose the stored content projection (without joined fields).
export const FavoriteLocationSchema = LocationSchema.omit({
  region: true,
  tags: true,
}).extend({
  extra: z.object({
    hiking: z
      .object({ best_seasons: z.array(z.string()).optional() })
      .optional(),
    facilities: z.array(z.string()).optional(),
  }),
});
export const FavoriteStorySchema = StorySchema.omit({
  displayTitle: true,
  author: true,
  location: true,
  team: true,
  tags: true,
  isLiked: true,
});
export const FavoriteLocationsResponseSchema = SuccessSchema.extend({
  data: z.object({
    items: z.array(
      z.object({
        createdAt: TimestampSchema,
        location: FavoriteLocationSchema,
      }),
    ),
    nextCursor: z.string().nullable(),
  }),
});
export const FavoriteStoriesResponseSchema = SuccessSchema.extend({
  data: z.object({
    items: z.array(
      z.object({ createdAt: TimestampSchema, story: FavoriteStorySchema }),
    ),
    nextCursor: z.string().nullable(),
  }),
});
export const ConversationListResponseSchema = SuccessSchema.extend({
  data: z.array(ConversationSchema),
  nextCursor: z.string().nullable(),
});
export const MessageListResponseSchema = SuccessSchema.extend({
  data: z.array(MessageSchema),
  nextCursor: z.string().nullable(),
  conversation: ConversationSchema.pick({
    id: true,
    teamId: true,
    memberUserId: true,
    initiatedByUserId: true,
    team: true,
    otherUser: true,
  }),
});
