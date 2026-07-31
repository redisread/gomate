import { z } from 'zod';

// Tool input schemas (stubs — real validation in #230/#231)

export const ListTeamsSchema = z.object({
  cityId: z.string().optional(),
  pageSize: z.number().optional(),
  cursor: z.string().optional(),
});

export const GetTeamSchema = z.object({
  teamId: z.string(),
});

export const ListLocationsSchema = z.object({
  cityId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  pageSize: z.number().optional(),
  cursor: z.string().optional(),
});

export const GetLocationSchema = z.object({
  locationId: z.string(),
});

export const ListStoriesSchema = z.object({
  teamId: z.string().optional(),
  pageSize: z.number().optional(),
  cursor: z.string().optional(),
});

export const CreateTeamSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  locationId: z.string(),
  scheduledDate: z.string(),
  maxMembers: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

export const JoinTeamSchema = z.object({
  teamId: z.string(),
  message: z.string().optional(),
});

export const CreateLocationSchema = z.object({
  name: z.string(),
  cityId: z.string(),
  address: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  tags: z.array(z.string()).optional(),
});

export const PublishStorySchema = z.object({
  teamId: z.string(),
  content: z.string(),
  images: z.array(z.string()).optional(),
});

export const MyStatusSchema = z.object({});

export const DiscoverEnumsSchema = z.object({
  enumType: z.enum(['city', 'difficulty', 'team_status', 'tag']).describe('Type of enum to discover'),
});

export const DryRunPreviewSchema = z.object({
  action: z.enum(['create_team', 'join_team', 'create_location', 'publish_story']),
  parameters: z.record(z.unknown()),
});

export type ListTeamsInput = z.infer<typeof ListTeamsSchema>;
export type GetTeamInput = z.infer<typeof GetTeamSchema>;
export type ListLocationsInput = z.infer<typeof ListLocationsSchema>;
export type GetLocationInput = z.infer<typeof GetLocationSchema>;
export type ListStoriesInput = z.infer<typeof ListStoriesSchema>;
export type CreateTeamInput = z.infer<typeof CreateTeamSchema>;
export type JoinTeamInput = z.infer<typeof JoinTeamSchema>;
export type CreateLocationInput = z.infer<typeof CreateLocationSchema>;
export type PublishStoryInput = z.infer<typeof PublishStorySchema>;
export type MyStatusInput = z.infer<typeof MyStatusSchema>;
