import { and, eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { TestDb } from "./db";

let idCounter = 1;

function genId(prefix = "id") {
  return `${prefix}_${idCounter++}_${Date.now()}`;
}

export async function seedUser(
  db: TestDb,
  overrides: Partial<schema.NewUser> = {},
): Promise<schema.User> {
  const id = overrides.id ?? genId("user");
  await db.insert(schema.users).values({
    id,
    name: `Test User ${id}`,
    email: `${id}@test.example`,
    emailVerified: true,
    role: "user",
    status: "active",
    extra: {
      level: "beginner",
      completed_hikes: 0,
      wechat: null,
      city: null,
    },
    ...overrides,
  });
  const [result] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return result;
}

export async function seedRegion(
  db: TestDb,
  overrides: Partial<schema.NewRegion> = {},
): Promise<schema.Region> {
  const id = overrides.id ?? genId("region");
  await db.insert(schema.region).values({
    id,
    countryCode: "CN",
    name: `Test Region ${id}`,
    slug: `test-region-${id}`,
    code: `test-${id}`,
    level: "city",
    timezone: "Asia/Shanghai",
    centerLatitude: 22.5431,
    centerLongitude: 114.0579,
    serviceEnabled: true,
    isHot: false,
    sortOrder: 0,
    ...overrides,
  });
  const [result] = await db.select().from(schema.region).where(eq(schema.region.id, id));
  return result;
}

export async function seedLocation(
  db: TestDb,
  regionId: string,
  overrides: Partial<schema.NewLocation> = {},
): Promise<schema.Location> {
  const id = overrides.id ?? genId("location");
  await db.insert(schema.locations).values({
    id,
    regionId,
    name: `Test Location ${id}`,
    slug: `test-location-${id}`,
    supportedActivityTypes: ["hiking"],
    status: "published",
    description: "Test location description",
    latitude: 22.5431,
    longitude: 114.0579,
    coverImageUrl: "https://gomate.cos.jiahongw.com/test/cover.jpg",
    images: [],
    extra: {},
    ...overrides,
  });
  const [result] = await db
    .select()
    .from(schema.locations)
    .where(eq(schema.locations.id, id));
  return result;
}

export async function seedTeam(
  db: TestDb,
  leaderId: string,
  locationId: string,
  overrides: Partial<schema.NewTeam> = {},
): Promise<schema.Team> {
  const id = overrides.id ?? genId("team");
  const startAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(schema.teams).values({
    id,
    locationId,
    leaderId,
    activityType: "hiking",
    title: `Test Team ${id}`,
    description: "Test team description",
    startAt,
    endAt: new Date(startAt.getTime() + 4 * 60 * 60 * 1000),
    maxParticipants: 5,
    requirements: [],
    recruitmentStatus: "open",
    checklist: null,
    ...overrides,
  });
  const [result] = await db.select().from(schema.teams).where(eq(schema.teams.id, id));
  return result;
}

export async function seedTeamJoinRequest(
  db: TestDb,
  teamId: string,
  userId: string,
  overrides: Partial<schema.NewTeamJoinRequest> = {},
): Promise<schema.TeamJoinRequest> {
  const id = overrides.id ?? genId("join_request");
  await db.insert(schema.teamJoinRequests).values({
    id,
    teamId,
    userId,
    status: "pending",
    ...overrides,
  });
  const [result] = await db
    .select()
    .from(schema.teamJoinRequests)
    .where(eq(schema.teamJoinRequests.id, id));
  return result;
}

export async function seedTeamMember(
  db: TestDb,
  teamId: string,
  userId: string,
  overrides: Partial<schema.NewTeamMember> = {},
): Promise<schema.TeamMember> {
  await db.insert(schema.teamMembers).values({
    teamId,
    userId,
    role: "member",
    joinedAt: new Date(),
    leftAt: null,
    ...overrides,
  });
  const [result] = await db
    .select()
    .from(schema.teamMembers)
    .where(
      and(
        eq(schema.teamMembers.teamId, teamId),
        eq(schema.teamMembers.userId, userId),
      ),
    );
  return result;
}

export async function seedStory(
  db: TestDb,
  authorId: string,
  overrides: Partial<schema.NewStory> = {},
): Promise<schema.Story> {
  const id = overrides.id ?? genId("story");
  await db.insert(schema.stories).values({
    id,
    authorId,
    teamId: null,
    locationId: null,
    title: `Test Story ${id}`,
    summary: "Test story summary",
    content: "Test story content",
    images: [],
    status: "published",
    viewCount: 0,
    likeCount: 0,
    ...overrides,
  });
  const [result] = await db.select().from(schema.stories).where(eq(schema.stories.id, id));
  return result;
}

export async function seedTag(
  db: TestDb,
  overrides: Partial<schema.NewTag> = {},
): Promise<schema.Tag> {
  const id = overrides.id ?? genId("tag");
  await db.insert(schema.tags).values({
    id,
    name: `Test Tag ${id}`,
    slug: `test-tag-${id}`,
    ...overrides,
  });
  const [result] = await db.select().from(schema.tags).where(eq(schema.tags.id, id));
  return result;
}

export async function seedLocationTag(
  db: TestDb,
  locationId: string,
  tagId: string,
): Promise<schema.LocationTag> {
  await db.insert(schema.locationTags).values({ locationId, tagId });
  const [result] = await db
    .select()
    .from(schema.locationTags)
    .where(
      and(
        eq(schema.locationTags.locationId, locationId),
        eq(schema.locationTags.tagId, tagId),
      ),
    );
  return result;
}

export async function seedTeamTag(
  db: TestDb,
  teamId: string,
  tagId: string,
): Promise<schema.TeamTag> {
  await db.insert(schema.teamTags).values({ teamId, tagId });
  const [result] = await db
    .select()
    .from(schema.teamTags)
    .where(and(eq(schema.teamTags.teamId, teamId), eq(schema.teamTags.tagId, tagId)));
  return result;
}

export async function seedStoryTag(
  db: TestDb,
  storyId: string,
  tagId: string,
): Promise<schema.StoryTag> {
  await db.insert(schema.storyTags).values({ storyId, tagId });
  const [result] = await db
    .select()
    .from(schema.storyTags)
    .where(and(eq(schema.storyTags.storyId, storyId), eq(schema.storyTags.tagId, tagId)));
  return result;
}

export async function seedConversation(
  db: TestDb,
  teamId: string,
  memberUserId: string,
  initiatedByUserId: string,
  overrides: Partial<schema.NewConversation> = {},
): Promise<schema.Conversation> {
  const id = overrides.id ?? genId("conversation");
  await db.insert(schema.conversations).values({
    id,
    teamId,
    memberUserId,
    initiatedByUserId,
    ...overrides,
  });
  const [result] = await db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, id));
  return result;
}

export async function seedMessage(
  db: TestDb,
  conversationId: string,
  senderId: string,
  overrides: Partial<schema.NewMessage> = {},
): Promise<schema.Message> {
  const id = overrides.id ?? genId("message");
  await db.insert(schema.messages).values({
    id,
    conversationId,
    senderId,
    content: "Test message",
    ...overrides,
  });
  const [result] = await db.select().from(schema.messages).where(eq(schema.messages.id, id));
  return result;
}
