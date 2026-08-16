import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "../../db/schema";
import { ContentD1Database } from "../helpers/content-db";
import { createTestDb } from "../helpers/db";

type SessionUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
};

let currentSession: { user: SessionUser } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];
let sqlite: ReturnType<typeof createTestDb>["sqlite"];
let d1: ContentD1Database;
let r2: FakeR2Bucket;
let backgroundTasks: Promise<unknown>[];

class FakeR2Bucket {
  readonly objects = new Map<
    string,
    {
      body: ArrayBuffer;
      httpMetadata?: R2HTTPMetadata;
      customMetadata?: Record<string, string>;
    }
  >();
  failPutSuffix: string | null = null;
  deleteFailuresRemaining = 0;
  deleteAttempts = 0;

  seed(key: string, body = new Uint8Array([1, 2, 3]).buffer) {
    this.objects.set(key, {
      body,
      httpMetadata: { contentType: "image/jpeg" },
    });
  }

  async get(key: string) {
    const stored = this.objects.get(key);
    return stored
      ? {
          body: stored.body,
          httpMetadata: stored.httpMetadata,
          customMetadata: stored.customMetadata,
        }
      : null;
  }

  async put(
    key: string,
    body: ArrayBuffer,
    options?: {
      httpMetadata?: R2HTTPMetadata;
      customMetadata?: Record<string, string>;
    },
  ) {
    if (this.failPutSuffix && key.endsWith(this.failPutSuffix)) {
      throw new Error("simulated R2 copy failure");
    }
    this.objects.set(key, {
      body,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
    });
    return {};
  }

  async delete(keys: string | string[]) {
    this.deleteAttempts += 1;
    if (this.deleteFailuresRemaining > 0) {
      this.deleteFailuresRemaining -= 1;
      throw new Error("simulated transient R2 delete failure");
    }
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.objects.delete(key);
    }
  }
}

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { default: storiesRoute } = await import("../../routes/stories");

function createApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/stories", storiesRoute);
  return app;
}

async function request(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {},
) {
  return app.fetch(
    new Request(`http://localhost${path}`, options),
    {
      DB: d1 as unknown as D1Database,
      R2: r2 as unknown as R2Bucket,
      R2_PUBLIC_URL: "https://gomate.cos.jiahongw.com",
    } as never,
    {
      waitUntil: (promise: Promise<unknown>) => {
        backgroundTasks.push(promise);
      },
      passThroughOnException: () => undefined,
      props: {},
    } as unknown as ExecutionContext,
  );
}

async function settleBackgroundTasks() {
  await Promise.all(backgroundTasks.splice(0));
}

function json(body: unknown, method = "POST"): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function signIn(user: schema.User) {
  currentSession = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

async function seedUser(id: string, role: schema.UserRole = "user") {
  const [user] = await testDb
    .insert(schema.users)
    .values({ id, name: id, email: `${id}@example.com`, role })
    .returning();
  return user;
}

async function seedRegion() {
  const [result] = await testDb
    .insert(schema.region)
    .values({
      id: "region-shenzhen",
      countryCode: "CN",
      name: "深圳",
      slug: "shenzhen",
      level: "city",
      timezone: "Asia/Shanghai",
      centerLatitude: 22.5431,
      centerLongitude: 114.0579,
      serviceEnabled: true,
    })
    .returning();
  return result;
}

async function seedLocation(
  id: string,
  regionId: string,
  overrides: Partial<schema.NewLocation> = {},
) {
  const [location] = await testDb
    .insert(schema.locations)
    .values({
      id,
      regionId,
      name: id,
      slug: id,
      supportedActivityTypes: ["hiking"],
      status: "published",
      description: `${id} description`,
      latitude: 22.54,
      longitude: 114.05,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${id}.jpg`,
      ...overrides,
    })
    .returning();
  return location;
}

async function seedTeam(
  id: string,
  leaderId: string,
  locationId: string,
  overrides: Partial<schema.NewTeam> = {},
) {
  const now = Date.now();
  const [team] = await testDb
    .insert(schema.teams)
    .values({
      id,
      leaderId,
      locationId,
      activityType: "hiking",
      title: id,
      startAt: new Date(now - 7_200_000),
      endAt: new Date(now - 3_600_000),
      formedAt: new Date(now - 10_800_000),
      recruitmentStatus: "closed",
      ...overrides,
    })
    .returning();
  return team;
}

async function seedStory(
  id: string,
  authorId: string,
  overrides: Partial<schema.NewStory> = {},
) {
  const [story] = await testDb
    .insert(schema.stories)
    .values({
      id,
      authorId,
      title: id,
      content: `${id} content`,
      images: [],
      status: "published",
      ...overrides,
    })
    .returning();
  return story;
}

describe("Stories V2 API", () => {
  let app: ReturnType<typeof createApp>;
  let author: schema.User;
  let member: schema.User;
  let outsider: schema.User;
  let region: schema.Region;
  let location: schema.Location;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    sqlite = fresh.sqlite;
    d1 = new ContentD1Database(sqlite);
    r2 = new FakeR2Bucket();
    backgroundTasks = [];
    app = createApp();
    currentSession = null;

    author = await seedUser("author");
    member = await seedUser("member");
    outsider = await seedUser("outsider");
    region = await seedRegion();
    location = await seedLocation("location-main", region.id);
  });

  it("creates a normal story with object-array images and dedicated story_tags", async () => {
    signIn(author);
    const tempKey = `temp/stories/${author.id}/cover.jpg`;
    r2.seed(tempKey);

    const response = await request(
      app,
      "/stories",
      json({
        title: "  山间日记  ",
        summary: "周末徒步",
        content: "  一段真实的徒步记录。  ",
        locationId: location.id,
        imageKeys: [tempKey, tempKey],
        tags: [" 徒步 ", "徒步", "露营"],
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as {
      success: boolean;
      data: { id: string };
    };
    expect(body.success).toBe(true);
    const finalKey = `stories/${body.data.id}/cover.jpg`;
    const image = `https://gomate.cos.jiahongw.com/${finalKey}`;
    await settleBackgroundTasks();

    const persisted = await testDb.query.stories.findFirst({
      where: eq(schema.stories.id, body.data.id),
    });
    expect(persisted).toMatchObject({
      title: "山间日记",
      content: "一段真实的徒步记录。",
      locationId: location.id,
      teamId: null,
      images: [image],
      likeCount: 0,
    });
    expect(typeof persisted?.images).not.toBe("string");
    expect(r2.objects.has(tempKey)).toBe(false);
    expect(r2.objects.has(finalKey)).toBe(true);

    const linkedTags = await testDb
      .select({ name: schema.tags.name })
      .from(schema.storyTags)
      .innerJoin(schema.tags, eq(schema.storyTags.tagId, schema.tags.id))
      .where(eq(schema.storyTags.storyId, body.data.id));
    expect(linkedTags.map(({ name }) => name).sort()).toEqual(["徒步", "露营"]);
  });

  it("retries idempotent background deletion after transient R2 failures", async () => {
    signIn(author);
    const tempKey = `temp/stories/${author.id}/retry.jpg`;
    r2.seed(tempKey);
    r2.deleteFailuresRemaining = 2;

    const response = await request(
      app,
      "/stories",
      json({
        title: "重试清理",
        content: "临时对象删除失败必须在 waitUntil 中重试。",
        imageKeys: [tempKey],
      }),
    );

    expect(response.status).toBe(201);
    await settleBackgroundTasks();
    expect(r2.deleteAttempts).toBe(3);
    expect(r2.objects.has(tempKey)).toBe(false);
  });

  it("rejects legacy image fields and temp keys owned by another user", async () => {
    signIn(author);

    const legacy = await request(
      app,
      "/stories",
      json({
        title: "旧格式",
        content: "不能被兼容",
        coverImage: "https://gomate.cos.jiahongw.com/legacy.jpg",
      }),
    );
    expect(legacy.status).toBe(400);

    const legacyImages = await request(
      app,
      "/stories",
      json({
        title: "旧图片格式",
        content: "客户端不能直接提交最终 URL",
        images: ["https://attacker.example/track.jpg"],
      }),
    );
    expect(legacyImages.status).toBe(400);

    const legacyHyphenKey = await request(
      app,
      "/stories",
      json({
        title: "旧临时键",
        content: "连字符格式不再兼容",
        imageKeys: [`temp/stories/${author.id}-legacy.jpg`],
      }),
    );
    expect(legacyHyphenKey.status).toBe(403);

    const foreignKey = `temp/stories/${outsider.id}/foreign.jpg`;
    r2.seed(foreignKey);
    const foreign = await request(
      app,
      "/stories",
      json({
        title: "越权图片",
        content: "不能归档其他用户的临时对象",
        imageKeys: [foreignKey],
      }),
    );
    expect(foreign.status).toBe(403);
    expect(r2.objects.has(foreignKey)).toBe(true);
  });

  it("allows an ended, formed team recap by the leader and derives its location", async () => {
    const team = await seedTeam("team-leader", author.id, location.id);
    signIn(author);
    const tempKey = `temp/stories/${author.id}/recap.jpg`;
    r2.seed(tempKey);

    const response = await request(
      app,
      "/stories",
      json({
        teamId: team.id,
        content: "队伍顺利完成行程。",
        imageKeys: [tempKey],
      }),
    );

    expect(response.status).toBe(201);
    await settleBackgroundTasks();
    const body = (await response.json()) as { data: { id: string } };
    const recap = await testDb.query.stories.findFirst({
      where: eq(schema.stories.id, body.data.id),
    });
    expect(recap).toMatchObject({
      authorId: author.id,
      teamId: team.id,
      locationId: location.id,
      title: null,
    });
  });

  it("allows an active participant to create a recap", async () => {
    const team = await seedTeam("team-member", author.id, location.id);
    await testDb.insert(schema.teamMembers).values({
      teamId: team.id,
      userId: member.id,
    });
    signIn(member);

    const response = await request(
      app,
      "/stories",
      json({ teamId: team.id, content: "队员视角的回顾。" }),
    );

    expect(response.status).toBe(201);
  });

  it("rejects a former participant who has left the team", async () => {
    const team = await seedTeam("team-former-member", author.id, location.id);
    await testDb.insert(schema.teamMembers).values({
      teamId: team.id,
      userId: member.id,
      leftAt: new Date(),
    });
    signIn(member);

    const response = await request(
      app,
      "/stories",
      json({ teamId: team.id, content: "已离队成员不能发布回顾。" }),
    );

    expect(response.status).toBe(403);
    expect(await testDb.$count(schema.stories)).toBe(0);
  });

  it.each([
    {
      name: "unformed team",
      overrides: { formedAt: null },
      session: "author",
      expected: 409,
    },
    {
      name: "cancelled team",
      overrides: { cancelledAt: new Date() },
      session: "author",
      expected: 409,
    },
    {
      name: "team that has not ended",
      overrides: { endAt: new Date(Date.now() + 3_600_000) },
      session: "author",
      expected: 409,
    },
    {
      name: "non-member author",
      overrides: {},
      session: "outsider",
      expected: 403,
    },
  ])("rejects a recap for $name", async ({ overrides, session, expected }) => {
    const team = await seedTeam(
      "team-invalid",
      author.id,
      location.id,
      overrides,
    );
    signIn(session === "author" ? author : outsider);

    const response = await request(
      app,
      "/stories",
      json({ teamId: team.id, content: "不应写入的回顾。" }),
    );

    expect(response.status).toBe(expected);
    const rows = await testDb
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.teamId, team.id));
    expect(rows).toHaveLength(0);
  });

  it("rejects a recap whose location differs from the team's location", async () => {
    const otherLocation = await seedLocation("location-other", region.id);
    const team = await seedTeam("team-location", author.id, location.id);
    signIn(author);

    const response = await request(
      app,
      "/stories",
      json({
        teamId: team.id,
        locationId: otherLocation.id,
        content: "地点被伪造。",
      }),
    );

    expect(response.status).toBe(409);
  });

  it("rechecks recap invariants in the conditional INSERT to close the race window", async () => {
    const team = await seedTeam("team-race", author.id, location.id);
    signIn(author);
    d1.beforeNextBatch = () => {
      sqlite
        .prepare("UPDATE teams SET cancelled_at = ? WHERE id = ?")
        .run(Date.now(), team.id);
    };

    const response = await request(
      app,
      "/stories",
      json({
        teamId: team.id,
        content: "并发取消后不能写入。",
        tags: ["竞态标签"],
      }),
    );

    expect(response.status).toBe(409);
    expect(await testDb.$count(schema.stories)).toBe(0);
    expect(await testDb.$count(schema.tags)).toBe(0);
  });

  it("compensates final and temp R2 objects when the D1 batch fails", async () => {
    signIn(author);
    const tempKey = `temp/stories/${author.id}/db-failure.jpg`;
    r2.seed(tempKey);
    d1.failNextBatch = new Error(
      "D1_ERROR: constraint failed; SQL: insert into stories ...",
    );

    const response = await request(
      app,
      "/stories",
      json({
        title: "D1 失败",
        content: "所有已复制对象都必须被清理。",
        imageKeys: [tempKey],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(JSON.stringify(body)).not.toMatch(/D1_ERROR|SQL:|insert into/u);
    expect(backgroundTasks).toHaveLength(1);
    await settleBackgroundTasks();
    expect(r2.objects.has(tempKey)).toBe(false);
    expect(
      [...r2.objects.keys()].some((key) => key.startsWith("stories/")),
    ).toBe(false);
    expect(await testDb.$count(schema.stories)).toBe(0);
  });

  it("cleans copied and temporary objects when an R2 copy fails midway", async () => {
    signIn(author);
    const firstKey = `temp/stories/${author.id}/first.jpg`;
    const secondKey = `temp/stories/${author.id}/second.jpg`;
    r2.seed(firstKey);
    r2.seed(secondKey);
    r2.failPutSuffix = "/second.jpg";

    const response = await request(
      app,
      "/stories",
      json({
        title: "复制失败",
        content: "部分复制不能留下孤儿对象。",
        imageKeys: [firstKey, secondKey],
      }),
    );

    expect(response.status).toBe(500);
    expect(backgroundTasks).toHaveLength(1);
    await settleBackgroundTasks();
    expect(r2.objects.size).toBe(0);
    expect(await testDb.$count(schema.stories)).toBe(0);
  });

  it("lists a tag-filtered feed with an opaque keyset cursor", async () => {
    const tagId = "tag-hiking";
    await testDb.insert(schema.tags).values({
      id: tagId,
      name: "徒步",
      slug: encodeURIComponent("徒步"),
    });
    for (let index = 0; index < 3; index += 1) {
      const story = await seedStory(`story-${index}`, author.id, {
        images: [`https://gomate.cos.jiahongw.com/story/${index}.jpg`],
        createdAt: new Date(Date.now() - index * 1_000),
      });
      await testDb
        .insert(schema.storyTags)
        .values({ storyId: story.id, tagId });
    }

    const first = await request(app, "/stories?tag=%E5%BE%92%E6%AD%A5&limit=2");
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      data: {
        items: Array<{ id: string; images: string[] }>;
        nextCursor: string | null;
      };
    };
    expect(firstBody.data.items).toHaveLength(2);
    expect(firstBody.data.items[0].images).toEqual([
      "https://gomate.cos.jiahongw.com/story/0.jpg",
    ]);
    expect(firstBody.data.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/u);

    const second = await request(
      app,
      `/stories?tag=%E5%BE%92%E6%AD%A5&limit=2&cursor=${firstBody.data.nextCursor}`,
    );
    const secondBody = (await second.json()) as {
      data: { items: Array<{ id: string }>; nextCursor: string | null };
    };
    expect(secondBody.data.items.map(({ id }) => id)).toEqual(["story-2"]);
    expect(secondBody.data.nextCursor).toBeNull();
  });

  it("filters the shared V2 feed by locationId or teamId", async () => {
    const firstTeam = await seedTeam("team-feed-1", author.id, location.id);
    const secondTeam = await seedTeam("team-feed-2", author.id, location.id);
    const otherLocation = await seedLocation("location-feed-other", region.id);
    await Promise.all([
      seedStory("story-location", author.id, { locationId: location.id }),
      seedStory("story-team-1", author.id, {
        teamId: firstTeam.id,
        locationId: location.id,
      }),
      seedStory("story-team-2", author.id, {
        teamId: secondTeam.id,
        locationId: location.id,
      }),
      seedStory("story-other-location", author.id, {
        locationId: otherLocation.id,
      }),
    ]);

    const locationResponse = await request(
      app,
      `/stories?locationId=${location.id}&limit=10`,
    );
    const locationBody = (await locationResponse.json()) as {
      data: { items: Array<{ id: string }>; nextCursor: string | null };
    };
    expect(locationResponse.status).toBe(200);
    expect(locationBody.data.items.map(({ id }) => id).sort()).toEqual([
      "story-location",
      "story-team-1",
      "story-team-2",
    ]);
    expect(locationBody.data.nextCursor).toBeNull();

    const teamResponse = await request(
      app,
      `/stories?teamId=${firstTeam.id}&limit=10`,
    );
    const teamBody = (await teamResponse.json()) as {
      data: { items: Array<{ id: string; teamId: string | null }> };
    };
    expect(teamResponse.status).toBe(200);
    expect(teamBody.data.items).toEqual([
      expect.objectContaining({ id: "story-team-1", teamId: firstTeam.id }),
    ]);
  });

  it("hides published stories linked to a non-public Location from every public read", async () => {
    const [closedRegion] = await testDb.insert(schema.region).values({
      id: "region-closed-story",
      countryCode: "CN",
      name: "未开放城市",
      slug: "closed-story",
      level: "city",
      serviceEnabled: false,
    }).returning();
    const draftLocation = await seedLocation("location-draft-story", region.id, {
      status: "draft",
      supportedActivityTypes: [],
    });
    const closedLocation = await seedLocation(
      "location-closed-story",
      closedRegion.id,
    );
    const visible = await seedStory("story-visible-location", author.id, {
      locationId: location.id,
    });
    const draftLinked = await seedStory("story-draft-location", author.id, {
      locationId: draftLocation.id,
    });
    const closedLinked = await seedStory("story-closed-location", author.id, {
      locationId: closedLocation.id,
    });
    await testDb.insert(schema.tags).values({
      id: "tag-visibility",
      name: "可见性",
      slug: "visibility",
    });
    await testDb.insert(schema.storyTags).values([
      { storyId: visible.id, tagId: "tag-visibility" },
      { storyId: draftLinked.id, tagId: "tag-visibility" },
      { storyId: closedLinked.id, tagId: "tag-visibility" },
    ]);

    const list = await request(app, "/stories?limit=20");
    const listBody = await list.json() as {
      data: { items: Array<{ id: string }> };
    };
    expect(listBody.data.items.map((item) => item.id)).toEqual([visible.id]);
    expect((await request(app, `/stories/${draftLinked.id}`)).status).toBe(404);
    expect((await request(app, `/stories/${closedLinked.id}`)).status).toBe(404);

    const tags = await request(app, "/stories/tags");
    await expect(tags.json()).resolves.toMatchObject({
      data: { items: [{ id: "tag-visibility", count: 1 }] },
    });
    const stats = await request(app, "/stories/stats");
    await expect(stats.json()).resolves.toMatchObject({
      data: {
        weeklyNewStories: 1,
        popularLocation: { id: location.id, storyCount: 1 },
      },
    });

    signIn(member);
    expect(
      (await request(app, `/stories/${closedLinked.id}/like`, { method: "POST" }))
        .status,
    ).toBe(404);
  });

  it("keeps story detail GET read-only and returns the shared isLiked DTO field", async () => {
    const story = await seedStory("story-read-only", author.id, {
      viewCount: 7,
    });
    signIn(member);
    await testDb.insert(schema.storyLikes).values({
      storyId: story.id,
      userId: member.id,
    });

    const response = await request(app, `/stories/${story.id}`);
    expect(response.status).toBe(200);
    const body = await response.json() as { data: Record<string, unknown> };
    expect(body.data).toMatchObject({ viewCount: 7, isLiked: true });
    expect(body.data).not.toHaveProperty("liked");
    expect(body.data).not.toHaveProperty("favorited");
    const persisted = await testDb.query.stories.findFirst({
      where: eq(schema.stories.id, story.id),
      columns: { viewCount: true },
    });
    expect(persisted?.viewCount).toBe(7);
  });

  it("rechecks Location visibility in the conditional story INSERT", async () => {
    signIn(author);
    d1.beforeNextBatch = () => {
      sqlite.prepare("UPDATE locations SET status = 'draft' WHERE id = ?")
        .run(location.id);
    };

    const response = await request(
      app,
      "/stories",
      json({
        title: "竞态地点",
        content: "地点在写入前失去公开可见性。",
        locationId: location.id,
      }),
    );

    expect(response.status).toBe(409);
    expect(await testDb.$count(schema.stories)).toBe(0);
  });

  it("rechecks Location visibility in the conditional story UPDATE", async () => {
    const story = await seedStory("story-location-update-race", author.id, {
      locationId: null,
    });
    await testDb.insert(schema.tags).values({
      id: "tag-location-update-race-old",
      name: "竞态旧标签",
      slug: encodeURIComponent("竞态旧标签"),
    });
    await testDb.insert(schema.storyTags).values({
      storyId: story.id,
      tagId: "tag-location-update-race-old",
    });
    signIn(author);
    d1.beforeNextBatch = () => {
      sqlite.prepare("UPDATE locations SET status = 'draft' WHERE id = ?")
        .run(location.id);
    };

    const response = await request(
      app,
      `/stories/${story.id}`,
      json(
        { locationId: location.id, tags: ["竞态新标签"] },
        "PUT",
      ),
    );

    expect(response.status).toBe(409);
    const persisted = await testDb.query.stories.findFirst({
      where: eq(schema.stories.id, story.id),
      columns: { locationId: true },
    });
    expect(persisted?.locationId).toBeNull();
    const linkedTags = await testDb
      .select({ name: schema.tags.name })
      .from(schema.storyTags)
      .innerJoin(schema.tags, eq(schema.storyTags.tagId, schema.tags.id))
      .where(eq(schema.storyTags.storyId, story.id));
    expect(linkedTags.map(({ name }) => name)).toEqual(["竞态旧标签"]);
    const dictionary = await testDb
      .select({ name: schema.tags.name })
      .from(schema.tags);
    expect(dictionary.map(({ name }) => name)).toEqual(["竞态旧标签"]);
  });

  it("replaces story_tags while only retaining or deleting owned final images", async () => {
    const retainedKey = "stories/story-update/retained.jpg";
    const removedKey = "stories/story-update/removed.jpg";
    r2.seed(retainedKey);
    r2.seed(removedKey);
    const story = await seedStory("story-update", author.id, {
      locationId: location.id,
      images: [
        `https://gomate.cos.jiahongw.com/${retainedKey}`,
        `https://gomate.cos.jiahongw.com/${removedKey}`,
      ],
    });
    await testDb.insert(schema.tags).values({
      id: "tag-old",
      name: "旧标签",
      slug: encodeURIComponent("旧标签"),
    });
    await testDb.insert(schema.storyTags).values({
      storyId: story.id,
      tagId: "tag-old",
    });
    signIn(author);

    const update = await request(
      app,
      `/stories/${story.id}`,
      json(
        {
          images: [`https://gomate.cos.jiahongw.com/${retainedKey}`],
          tags: ["新标签"],
        },
        "PUT",
      ),
    );
    expect(update.status).toBe(200);
    expect(backgroundTasks).toHaveLength(1);
    await settleBackgroundTasks();
    expect(r2.objects.has(retainedKey)).toBe(true);
    expect(r2.objects.has(removedKey)).toBe(false);

    const detail = await request(app, `/stories/${story.id}`);
    const body = (await detail.json()) as {
      data: { images: string[]; tags: Array<{ name: string }> };
    };
    expect(body.data.images).toEqual([
      `https://gomate.cos.jiahongw.com/${retainedKey}`,
    ]);
    expect(body.data.tags.map(({ name }) => name)).toEqual(["新标签"]);

    const inject = await request(
      app,
      `/stories/${story.id}`,
      json(
        {
          images: [
            `https://gomate.cos.jiahongw.com/stories/another-story/foreign.jpg`,
          ],
        },
        "PUT",
      ),
    );
    expect(inject.status).toBe(400);
  });

  it("toggles only story_likes while triggers maintain likeCount", async () => {
    const story = await seedStory("story-like", author.id);
    signIn(member);

    const liked = await request(app, `/stories/${story.id}/like`, {
      method: "POST",
    });
    expect(liked.status).toBe(200);
    expect(await liked.json()).toMatchObject({
      success: true,
      data: { liked: true, likeCount: 1 },
    });
    expect(
      await testDb.$count(
        schema.storyLikes,
        and(
          eq(schema.storyLikes.userId, member.id),
          eq(schema.storyLikes.storyId, story.id),
        ),
      ),
    ).toBe(1);
    expect(
      (
        await testDb.query.stories.findFirst({
          where: eq(schema.stories.id, story.id),
        })
      )?.likeCount,
    ).toBe(1);

    const unliked = await request(app, `/stories/${story.id}/like`, {
      method: "POST",
    });
    expect(await unliked.json()).toMatchObject({
      success: true,
      data: { liked: false, likeCount: 0 },
    });
    expect(await testDb.$count(schema.storyLikes)).toBe(0);
  });

  it("maps trigger failures without exposing D1 or SQL diagnostics", async () => {
    const story = await seedStory("story-like-error", author.id);
    signIn(member);
    d1.failNextRun = new Error(
      "D1_ERROR: STORY_LIKE_COUNT_FAILED; SQL: insert into story_likes ...",
    );

    const response = await request(app, `/stories/${story.id}/like`, {
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      success: false,
      error: { code: "STORY_LIKE_COUNT_FAILED" },
    });
    expect(JSON.stringify(body)).not.toMatch(/D1_ERROR|SQL:|insert into/u);
  });

  it("does not expose the removed share-stats route or share_events references", async () => {
    const story = await seedStory("story-share", author.id);

    const response = await request(app, `/stories/${story.id}/share-stats`);
    expect(response.status).toBe(404);

    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../routes/stories.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/share[-_]?stats|shareEvents|share_events/iu);
  });
});
