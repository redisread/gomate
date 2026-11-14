import { env, exports } from "cloudflare:workers";
import { applyD1Migrations, createScheduledController, reset } from "cloudflare:test";
import { afterEach, describe, expect, it } from "vitest";
import { scheduled } from "../../src/server/scheduled";

afterEach(() => reset());

const now = Date.parse("2026-09-23T04:00:00Z");
const cutoff = now - 86_400_000;
const controller = createScheduledController({ scheduledTime: now });

async function seedTeams() {
  await applyD1Migrations(env.DB, JSON.parse(env.TEST_MIGRATIONS as string));
  await env.DB.prepare("INSERT INTO users(id,name,email,email_verified) VALUES ('cron-leader','Cron','cron@example.test',1)").run();
  const locationId = await env.DB.prepare("SELECT id FROM locations LIMIT 1").first<string>("id");
  const cases = [
    ["overdue", cutoff - 1, "open", null, null],
    ["boundary", cutoff, "open", null, null],
    ["too-early", cutoff + 1, "open", null, null],
    ["future", now + 1, "open", null, null],
    ["completed", cutoff - 1, "open", 1, null],
    ["closed", cutoff - 1, "closed", null, null],
    ["cancelled", cutoff - 1, "closed", null, 1],
  ];
  await env.DB.batch(
    cases.map((values) =>
      env.DB.prepare(`INSERT INTO teams
        (id,end_at,recruitment_status,formed_at,cancelled_at,updated_at,
         location_id,leader_id,activity_type,title,start_at,max_participants)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'cron-leader','explore','Cron',0,6)`)
        .bind(...values, locationId),
    ),
  );
}

describe("automatic team closure in D1", () => {
  it("runs the deployed scheduled entrypoint", async () => {
    await seedTeams();
    await exports.default.scheduled({ scheduledTime: now, cron: "0 * * * *" });
    expect(
      await env.DB.prepare(
        "SELECT recruitment_status FROM teams WHERE id = 'overdue'",
      ).first("recruitment_status"),
    ).toBe("closed");
  });

  it("closes only unfinished open teams at end + 24h and is idempotent", async () => {
    await seedTeams();
    await scheduled(controller, env);
    const rows = await env.DB.prepare(
      "SELECT id, recruitment_status, updated_at FROM teams ORDER BY id",
    ).all();
    expect(rows.results).toEqual([
      { id: "boundary", recruitment_status: "closed", updated_at: now },
      { id: "cancelled", recruitment_status: "closed", updated_at: 0 },
      { id: "closed", recruitment_status: "closed", updated_at: 0 },
      { id: "completed", recruitment_status: "open", updated_at: 0 },
      { id: "future", recruitment_status: "open", updated_at: 0 },
      { id: "overdue", recruitment_status: "closed", updated_at: now },
      { id: "too-early", recruitment_status: "open", updated_at: 0 },
    ]);
    await scheduled(controller, env);
    expect(
      (
        await env.DB.prepare(
          "SELECT id, recruitment_status, updated_at FROM teams ORDER BY id",
        ).all()
      ).results,
    ).toEqual(rows.results);
  });

  it("preserves a team whose end time was extended before the write", async () => {
    await seedTeams();
    await env.DB.prepare("UPDATE teams SET end_at = ? WHERE id = 'overdue'")
      .bind(now + 86_400_000)
      .run();
    await scheduled(controller, env);
    expect(
      await env.DB.prepare(
        "SELECT recruitment_status FROM teams WHERE id = 'overdue'",
      ).first("recruitment_status"),
    ).toBe("open");
  });
});
