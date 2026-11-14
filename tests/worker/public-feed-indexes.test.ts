import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createDb } from "../../src/server/db";
import * as schema from "../../src/server/db/schema";
import { buildLocationPageQuery } from "../../src/server/routes/locations/queries";
import { buildTeamPageQuery } from "../../src/server/routes/teams/queries";

afterEach(() => reset());

it("keeps current-schema query results stable with and without the public feed indexes", async () => {
  const migrations = JSON.parse((env as unknown as { TEST_MIGRATIONS: string }).TEST_MIGRATIONS);
  await applyD1Migrations(env.DB, migrations);
  await env.DB.batch([env.DB.prepare("DROP INDEX locations_public_feed_idx"), env.DB.prepare("DROP INDEX teams_start_feed_idx")]);
  const db = createDb(env.DB);
  await env.DB.prepare("INSERT INTO users(id,name,email) VALUES ('feed-user','Feed','feed@example.test')").run();
  const location = await db.select({ id: schema.locations.id }).from(schema.locations).where(eq(schema.locations.status, "published")).limit(1);
  await env.DB.batch([0, 1, 2].map((index) => env.DB.prepare(
    "INSERT INTO teams(id,location_id,leader_id,activity_type,title,start_at,end_at) VALUES (?,?,'feed-user','hiking',?,1000000,2000000)",
  ).bind(`feed-${index}`, location[0].id, `Feed ${index}`)));
  const locationQuery = () => buildLocationPageQuery(db, and(
    eq(schema.locations.status, "published"), eq(schema.region.level, "city"), eq(schema.region.serviceEnabled, true),
  ), 13);
  const teamQuery = () => buildTeamPageQuery(db, eq(schema.teams.recruitmentStatus, "open"), 13);
  // Same query functions run before and after indexes; no runtime dependency on them.
  const beforeLocations = await locationQuery();
  const beforeTeams = await teamQuery();
  expect(beforeTeams.map((row) => row.team.id)).toEqual(["feed-0", "feed-1", "feed-2"]);
  await env.DB.batch([
    env.DB.prepare("CREATE INDEX locations_public_feed_idx ON locations(status,created_at,id)"),
    env.DB.prepare("CREATE INDEX teams_start_feed_idx ON teams(start_at,id)"),
  ]);
  expect(await locationQuery()).toEqual(beforeLocations);
  expect(await teamQuery()).toEqual(beforeTeams);
  for (const [query, index] of [[locationQuery(), "locations_public_feed_idx"], [teamQuery(), "teams_start_feed_idx"]] as const) {
    const statement = query.toSQL();
    const plan = await env.DB.prepare(`EXPLAIN QUERY PLAN ${statement.sql}`).bind(...statement.params).all<{ detail: string }>();
    const details = plan.results.map((row) => row.detail).join("\n");
    expect(details).toContain(index);
    expect(details).not.toContain("USE TEMP B-TREE FOR ORDER BY");
  }
});
