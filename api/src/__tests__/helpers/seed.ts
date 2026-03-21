import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { TestDb } from "./db";

let idCounter = 1;
function genId(prefix = "id") {
  return `${prefix}_${idCounter++}_${Date.now()}`;
}

const now = () => Math.floor(Date.now() / 1000);

/**
 * 插入测试用户
 */
export async function seedUser(
  db: TestDb,
  overrides: Partial<schema.NewUser> = {}
): Promise<schema.User> {
  const id = genId("user");
  const ts = new Date();
  const user: schema.NewUser = {
    id,
    name: overrides.name ?? `TestUser_${id}`,
    email: overrides.email ?? `${id}@test.com`,
    emailVerified: overrides.emailVerified ?? false,
    level: overrides.level ?? "beginner",
    role: overrides.role ?? "user",
    status: overrides.status ?? "active",
    createdAt: overrides.createdAt ?? ts,
    updatedAt: overrides.updatedAt ?? ts,
    ...overrides,
    id, // 确保 id 不被覆盖
  };
  await db.insert(schema.users).values(user);
  const [inserted] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return inserted;
}

/**
 * 插入测试城市
 */
export async function seedCity(
  db: TestDb,
  overrides: Partial<schema.NewCity> = {}
): Promise<schema.City> {
  const id = genId("city");
  const ts = new Date();
  const city: schema.NewCity = {
    id,
    adcode: overrides.adcode ?? `44030${idCounter}`,
    name: overrides.name ?? `TestCity_${id}`,
    isHot: overrides.isHot ?? false,
    createdAt: overrides.createdAt ?? ts,
    updatedAt: overrides.updatedAt ?? ts,
    ...overrides,
    id,
  };
  await db.insert(schema.cities).values(city);
  const [inserted] = await db.select().from(schema.cities).where(eq(schema.cities.id, id));
  return inserted;
}

/**
 * 插入测试地点
 */
export async function seedLocation(
  db: TestDb,
  cityId: string,
  overrides: Partial<schema.NewLocation> = {}
): Promise<schema.Location> {
  const id = genId("loc");
  const ts = new Date();
  const location: schema.NewLocation = {
    id,
    name: overrides.name ?? `TestLocation_${id}`,
    slug: overrides.slug ?? `test-location-${id}`,
    description: overrides.description ?? "测试地点描述",
    cityId,
    bestSeason: overrides.bestSeason ?? JSON.stringify(["spring", "autumn"]),
    coverImage: overrides.coverImage ?? "https://example.com/cover.jpg",
    images: overrides.images ?? JSON.stringify([]),
    coordinates: overrides.coordinates ?? JSON.stringify({ lat: 22.5, lng: 114.0 }),
    createdAt: overrides.createdAt ?? ts,
    updatedAt: overrides.updatedAt ?? ts,
    ...overrides,
    id,
  };
  await db.insert(schema.locations).values(location);
  const [inserted] = await db.select().from(schema.locations).where(eq(schema.locations.id, id));
  return inserted;
}

/**
 * 插入测试队伍
 */
export async function seedTeam(
  db: TestDb,
  leaderId: string,
  locationId: string,
  overrides: Partial<schema.NewTeam> = {}
): Promise<schema.Team> {
  const id = genId("team");
  const ts = new Date();
  const futureTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const team: schema.NewTeam = {
    id,
    locationId,
    leaderId,
    title: overrides.title ?? `TestTeam_${id}`,
    startTime: overrides.startTime ?? futureTime,
    endTime: overrides.endTime ?? new Date(futureTime.getTime() + 4 * 60 * 60 * 1000),
    durationMin: overrides.durationMin ?? 240,
    maxMembers: overrides.maxMembers ?? 5,
    icon: overrides.icon ?? "⛰️",
    status: overrides.status ?? "recruiting",
    createdAt: overrides.createdAt ?? ts,
    updatedAt: overrides.updatedAt ?? ts,
    ...overrides,
    id,
  };
  await db.insert(schema.teams).values(team);
  const [inserted] = await db.select().from(schema.teams).where(eq(schema.teams.id, id));
  return inserted;
}

/**
 * 插入队伍成员
 */
export async function seedTeamMember(
  db: TestDb,
  teamId: string,
  userId: string,
  status: schema.TeamMemberStatus = "approved"
): Promise<schema.TeamMember> {
  const id = genId("tm");
  const ts = new Date();
  const member: schema.NewTeamMember = {
    id,
    teamId,
    userId,
    status,
    joinedAt: status === "approved" ? ts : undefined,
    createdAt: ts,
  };
  await db.insert(schema.teamMembers).values(member);
  const [inserted] = await db.select().from(schema.teamMembers).where(eq(schema.teamMembers.id, id));
  return inserted;
}
