import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "../../db/schema";
import { ContentD1Database } from "../helpers/content-db";
import { createTestDb } from "../helpers/db";

type SessionUser = { id: string; email: string; name: string };

let currentSession: { user: SessionUser } | null = null;
let testDb: ReturnType<typeof createTestDb>["db"];
let d1: ContentD1Database;

vi.mock("../../lib/auth", () => ({
  createAuth: () => ({
    api: { getSession: async () => currentSession },
  }),
}));

vi.mock("../../db", () => ({
  createDb: () => testDb,
}));

const { favoritesRoute } = await import("../../routes/favorites");

function createApp() {
  const app = new Hono<{ Bindings: { DB: D1Database } }>();
  app.route("/favorites", favoritesRoute);
  return app;
}

async function request(
  app: ReturnType<typeof createApp>,
  path: string,
  options: RequestInit = {},
) {
  return app.fetch(new Request(`http://localhost${path}`, options), {
    DB: d1 as unknown as D1Database,
  });
}

function json(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function seedUser(id: string) {
  const [user] = await testDb
    .insert(schema.users)
    .values({ id, name: id, email: `${id}@example.com` })
    .returning();
  return user;
}

async function seedRegion(
  id = "region-shenzhen",
  serviceEnabled = true,
) {
  const [result] = await testDb
    .insert(schema.region)
    .values({
      id,
      countryCode: "CN",
      name: "深圳",
      slug: id,
      level: "city",
      timezone: "Asia/Shanghai",
      centerLatitude: 22.5431,
      centerLongitude: 114.0579,
      serviceEnabled,
    })
    .returning();
  return result;
}

async function seedLocation(
  id: string,
  regionId: string,
  status: schema.LocationStatus = "published",
) {
  const [location] = await testDb
    .insert(schema.locations)
    .values({
      id,
      regionId,
      name: id,
      slug: id,
      supportedActivityTypes: ["hiking"],
      status,
      description: `${id} description`,
      latitude: 22.54,
      longitude: 114.05,
      coverImageUrl: `https://gomate.cos.jiahongw.com/${id}.jpg`,
    })
    .returning();
  return location;
}

async function seedStory(
  id: string,
  authorId: string,
  createdAt = new Date(),
  locationId: string | null = null,
) {
  const [story] = await testDb
    .insert(schema.stories)
    .values({
      id,
      authorId,
      title: id,
      content: `${id} content`,
      images: [`https://gomate.cos.jiahongw.com/story/${id}.jpg`],
      status: "published",
      locationId,
      createdAt,
    })
    .returning();
  return story;
}

function signIn(user: schema.User | null) {
  currentSession = user
    ? { user: { id: user.id, email: user.email, name: user.name } }
    : null;
}

describe("Favorites V2 API", () => {
  let app: ReturnType<typeof createApp>;
  let user: schema.User;
  let author: schema.User;
  let location: schema.Location;
  let story: schema.Story;

  beforeEach(async () => {
    const fresh = createTestDb();
    testDb = fresh.db;
    d1 = new ContentD1Database(fresh.sqlite);
    app = createApp();
    currentSession = null;

    user = await seedUser("favorite-user");
    author = await seedUser("story-author");
    const region = await seedRegion();
    location = await seedLocation("favorite-location", region.id);
    story = await seedStory("favorite-story", author.id);
  });

  it("exposes only explicit locations and stories resources", async () => {
    signIn(user);

    expect((await request(app, "/favorites")).status).toBe(404);
    expect(
      (
        await request(
          app,
          "/favorites",
          json({ entityType: "location", entityId: location.id }),
        )
      ).status,
    ).toBe(404);
  });

  it.each(["/favorites/locations", "/favorites/stories"])(
    "requires authentication for %s",
    async (path) => {
      signIn(null);
      expect((await request(app, path)).status).toBe(401);
      expect(
        (await request(app, path, json({ locationId: location.id }))).status,
      ).toBe(401);
    },
  );

  it("creates, lists, and deletes a location favorite through its dedicated table", async () => {
    signIn(user);

    const created = await request(
      app,
      "/favorites/locations",
      json({ locationId: location.id }),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      success: true,
      data: { locationId: location.id },
    });
    expect(await testDb.$count(schema.userLocationFavorites)).toBe(1);
    expect(await testDb.$count(schema.userStoryFavorites)).toBe(0);

    const listed = await request(app, "/favorites/locations");
    const listBody = (await listed.json()) as {
      data: {
        items: Array<{ location: { id: string; coverImageUrl: string } }>;
        nextCursor: string | null;
      };
    };
    expect(listBody.data.items).toHaveLength(1);
    expect(listBody.data.items[0].location).toMatchObject({
      id: location.id,
      coverImageUrl: location.coverImageUrl,
    });

    const removed = await request(
      app,
      `/favorites/locations?locationId=${location.id}`,
      { method: "DELETE" },
    );
    expect(removed.status).toBe(200);
    expect(await removed.json()).toMatchObject({
      success: true,
      data: { locationId: location.id, removed: true },
    });
    expect(await testDb.$count(schema.userLocationFavorites)).toBe(0);
  });

  it("creates, lists, and deletes a story favorite through its dedicated table", async () => {
    signIn(user);

    const created = await request(
      app,
      "/favorites/stories",
      json({ storyId: story.id }),
    );
    expect(created.status).toBe(201);
    expect(await testDb.$count(schema.userStoryFavorites)).toBe(1);
    expect(await testDb.$count(schema.userLocationFavorites)).toBe(0);

    const listed = await request(app, "/favorites/stories");
    const listBody = (await listed.json()) as {
      data: { items: Array<{ story: { id: string; images: string[] } }> };
    };
    expect(listBody.data.items[0].story).toMatchObject({
      id: story.id,
      images: story.images,
    });
    expect(typeof listBody.data.items[0].story.images).not.toBe("string");

    const removed = await request(
      app,
      `/favorites/stories?storyId=${story.id}`,
      { method: "DELETE" },
    );
    expect(removed.status).toBe(200);
    expect(await testDb.$count(schema.userStoryFavorites)).toBe(0);
  });

  it("lists only favorites whose targets are publicly visible", async () => {
    signIn(user);
    const closedRegion = await seedRegion("region-closed", false);
    const draftLocation = await seedLocation(
      "favorite-location-draft",
      location.regionId,
      "draft",
    );
    const closedLocation = await seedLocation(
      "favorite-location-closed",
      closedRegion.id,
    );
    const visibleStory = await seedStory(
      "favorite-story-visible-location",
      author.id,
      new Date(),
      location.id,
    );
    const hiddenStory = await seedStory(
      "favorite-story-hidden-location",
      author.id,
      new Date(),
      closedLocation.id,
    );
    await testDb.insert(schema.userLocationFavorites).values([
      { userId: user.id, locationId: location.id },
      { userId: user.id, locationId: draftLocation.id },
      { userId: user.id, locationId: closedLocation.id },
    ]);
    await testDb.insert(schema.userStoryFavorites).values([
      { userId: user.id, storyId: visibleStory.id },
      { userId: user.id, storyId: hiddenStory.id },
    ]);

    const locations = await request(app, "/favorites/locations");
    const locationBody = await locations.json() as {
      data: { items: Array<{ location: { id: string } }> };
    };
    expect(locationBody.data.items.map((item) => item.location.id)).toEqual([
      location.id,
    ]);

    const stories = await request(app, "/favorites/stories");
    const storyBody = await stories.json() as {
      data: { items: Array<{ story: { id: string } }> };
    };
    expect(storyBody.data.items.map((item) => item.story.id)).toEqual([
      visibleStory.id,
    ]);
  });

  it("uses conditional DML so visibility changes cannot race favorite creation", async () => {
    signIn(user);
    d1.beforeNextRun = () => {
      testDb.update(schema.locations)
        .set({ status: "draft" })
        .where(eq(schema.locations.id, location.id))
        .run();
    };

    const response = await request(
      app,
      "/favorites/locations",
      json({ locationId: location.id }),
    );

    expect(response.status).toBe(404);
    expect(await testDb.$count(schema.userLocationFavorites)).toBe(0);
  });

  it("rechecks an associated Location while conditionally creating a story favorite", async () => {
    signIn(user);
    const linkedStory = await seedStory(
      "favorite-story-location-race",
      author.id,
      new Date(),
      location.id,
    );
    d1.beforeNextRun = () => {
      testDb.update(schema.locations)
        .set({ status: "draft" })
        .where(eq(schema.locations.id, location.id))
        .run();
    };

    const response = await request(
      app,
      "/favorites/stories",
      json({ storyId: linkedStory.id }),
    );

    expect(response.status).toBe(404);
    expect(await testDb.$count(schema.userStoryFavorites)).toBe(0);
  });

  it("returns 409 for a duplicate without creating another relation", async () => {
    signIn(user);

    const first = await request(
      app,
      "/favorites/locations",
      json({ locationId: location.id }),
    );
    const duplicate = await request(
      app,
      "/favorites/locations",
      json({ locationId: location.id }),
    );

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(await testDb.$count(schema.userLocationFavorites)).toBe(1);
  });

  it("rejects missing targets and legacy polymorphic request bodies", async () => {
    signIn(user);

    const missing = await request(
      app,
      "/favorites/stories",
      json({ storyId: "missing-story" }),
    );
    expect(missing.status).toBe(404);

    const legacy = await request(
      app,
      "/favorites/locations",
      json({ entityType: "location", entityId: location.id }),
    );
    expect(legacy.status).toBe(400);
    expect(await testDb.$count(schema.userStoryFavorites)).toBe(0);
    expect(await testDb.$count(schema.userLocationFavorites)).toBe(0);
  });

  it("paginates favorite lists with a stable keyset cursor", async () => {
    signIn(user);
    for (let index = 0; index < 3; index += 1) {
      const item = await seedStory(
        `favorite-story-${index}`,
        author.id,
        new Date(Date.now() - index * 1_000),
      );
      await testDb.insert(schema.userStoryFavorites).values({
        userId: user.id,
        storyId: item.id,
        createdAt: new Date(Date.now() - index * 1_000),
      });
    }

    const first = await request(app, "/favorites/stories?limit=2");
    const firstBody = (await first.json()) as {
      data: {
        items: Array<{ story: { id: string } }>;
        nextCursor: string | null;
      };
    };
    expect(firstBody.data.items).toHaveLength(2);
    expect(firstBody.data.nextCursor).toMatch(/^[A-Za-z0-9_-]+$/u);

    const second = await request(
      app,
      `/favorites/stories?limit=2&cursor=${firstBody.data.nextCursor}`,
    );
    const secondBody = (await second.json()) as {
      data: {
        items: Array<{ story: { id: string } }>;
        nextCursor: string | null;
      };
    };
    expect(secondBody.data.items.map(({ story: item }) => item.id)).toEqual([
      "favorite-story-2",
    ]);
    expect(secondBody.data.nextCursor).toBeNull();
  });

  it("maps database failures to a generic envelope without raw SQL", async () => {
    signIn(user);
    d1.failNextRun = new Error(
      "D1_ERROR: UNIQUE constraint failed: user_location_favorites.user_id; SQL: insert ...",
    );

    const response = await request(
      app,
      "/favorites/locations",
      json({ locationId: location.id }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      success: false,
      error: { code: "DATABASE_CONSTRAINT_FAILED" },
    });
    expect(JSON.stringify(body)).not.toMatch(
      /UNIQUE|SQL:|user_location_favorites/u,
    );
  });

  it("returns 400 for an invalid cursor instead of leaking parser details", async () => {
    signIn(user);

    const response = await request(
      app,
      "/favorites/locations?cursor=not-valid!",
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
  });

  it("cascades deleted targets so no orphan favorite remains", async () => {
    signIn(user);
    await testDb.insert(schema.userStoryFavorites).values({
      userId: user.id,
      storyId: story.id,
    });

    await testDb.delete(schema.stories).where(eq(schema.stories.id, story.id));

    expect(await testDb.$count(schema.userStoryFavorites)).toBe(0);
  });
});
