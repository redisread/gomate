import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import type { TestDb } from "./db";

let idCounter = 1;
function genId(prefix = "id") {
  return `${prefix}_${idCounter++}_${Date.now()}`;
}

/**
 * 插入测试用户
 */
export async function seedUser(
  db: TestDb,
  overrides: Partial<schema.NewUser> = {}
): Promise<schema.User> {
  const id = genId("user");
  const ts = new Date();
  // 排除 id，避免对象字面量重复属性
  const { id: _omitId, ...restOverrides } = overrides;
  const user: schema.NewUser = {
    id,
    name: restOverrides.name ?? `TestUser_${id}`,
    email: restOverrides.email ?? `${id}@test.com`,
    emailVerified: restOverrides.emailVerified ?? false,
    level: restOverrides.level ?? "beginner",
    role: restOverrides.role ?? "user",
    status: restOverrides.status ?? "active",
    createdAt: restOverrides.createdAt ?? ts,
    updatedAt: restOverrides.updatedAt ?? ts,
    ...restOverrides,
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
  // 排除 id，避免对象字面量重复属性
  const { id: _omitId, ...restOverrides } = overrides;
  const city: schema.NewCity = {
    id,
    adcode: restOverrides.adcode ?? `44030${idCounter}`,
    name: restOverrides.name ?? `TestCity_${id}`,
    isHot: restOverrides.isHot ?? false,
    createdAt: restOverrides.createdAt ?? ts,
    updatedAt: restOverrides.updatedAt ?? ts,
    ...restOverrides,
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
  // 排除 id，避免对象字面量重复属性
  const { id: _omitId, ...restOverrides } = overrides;
  const location: schema.NewLocation = {
    id,
    name: restOverrides.name ?? `TestLocation_${id}`,
    slug: restOverrides.slug ?? `test-location-${id}`,
    description: restOverrides.description ?? "测试地点描述",
    cityId,
    bestSeason: restOverrides.bestSeason ?? JSON.stringify(["spring", "autumn"]),
    coverImage: restOverrides.coverImage ?? "https://example.com/cover.jpg",
    images: restOverrides.images ?? JSON.stringify([]),
    coordinates: restOverrides.coordinates ?? JSON.stringify({ lat: 22.5, lng: 114.0 }),
    createdAt: restOverrides.createdAt ?? ts,
    updatedAt: restOverrides.updatedAt ?? ts,
    ...restOverrides,
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
  // 排除 id，避免对象字面量重复属性
  const { id: _omitId, ...restOverrides } = overrides;
  const team: schema.NewTeam = {
    id,
    locationId,
    leaderId,
    title: restOverrides.title ?? `TestTeam_${id}`,
    startTime: restOverrides.startTime ?? futureTime,
    endTime: restOverrides.endTime ?? new Date(futureTime.getTime() + 4 * 60 * 60 * 1000),
    durationMin: restOverrides.durationMin ?? 240,
    maxMembers: restOverrides.maxMembers ?? 5,
    icon: restOverrides.icon ?? "⛰️",
    status: restOverrides.status ?? "recruiting",
    createdAt: restOverrides.createdAt ?? ts,
    updatedAt: restOverrides.updatedAt ?? ts,
    ...restOverrides,
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
