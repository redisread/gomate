import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiApp } from "../../src/server/app";
import { createAuth } from "../../src/server/lib/auth";

const origin = "https://gomate.live";
const bindings = () => ({ ...env, APP_URL: origin, WRITE_MODE: "open", BETTER_AUTH_SECRET: "team-reliability-test-secret-at-least-32" } as typeof env);
let headers: Headers;
let input: Record<string, unknown>;
async function request(path: string, method: string, body?: unknown) {
  return apiApp.fetch(new Request(`${origin}/teams${path}`, {
    method, headers, ...(body ? { body: JSON.stringify(body) } : {}),
  }), bindings());
}
beforeEach(async () => {
  await applyD1Migrations(env.DB, JSON.parse((env as unknown as { TEST_MIGRATIONS: string }).TEST_MIGRATIONS));
  await env.DB.prepare(`INSERT INTO users(id,name,email,email_verified,extra) VALUES ('writer','Writer','writer@example.test',1,'{"wechat":"writer"}')`).run();
  const context = await createAuth(bindings()).$context;
  const session = await context.internalAdapter.createSession("writer");
  headers = new Headers({ authorization: `Bearer ${session!.token}`, origin, "content-type": "application/json" });
  const locationId = await env.DB.prepare("SELECT id FROM locations WHERE status='published' LIMIT 1").first<string>("id");
  input = { requestId: crypto.randomUUID(), locationId, activityType: "explore", title: "Original", startAt: new Date(Date.now()+86400000).toISOString(), endAt: new Date(Date.now()+90000000).toISOString(), maxParticipants: 6 };
});
afterEach(() => { vi.restoreAllMocks(); return reset(); });

describe("team write recovery with real D1", () => {
  it("replays concurrent creation as the same team and rejects changed input", async () => {
    const responses = await Promise.all([request("", "POST", input), request("", "POST", input)]);
    expect(responses.map(r => r.status)).toEqual([201, 201]);
    const bodies = await Promise.all(responses.map(r => r.json<{ team: { id: string } }>()));
    expect(bodies[0].team.id).toBe(bodies[1].team.id);
    expect(await env.DB.prepare("SELECT count(*) AS count FROM teams WHERE leader_id='writer'").first("count")).toBe(1);
    expect((await request("", "POST", { ...input, title: "Different" })).status).toBe(409);
  });
  it("does not recreate a deleted result on retry", async () => {
    const first = await request("", "POST", input);
    const { team } = await first.json<{ team: { id: string } }>();
    expect((await request(`/${team.id}`, "DELETE")).status).toBe(200);
    expect((await request("", "POST", input)).status).toBe(409);
    expect(await env.DB.prepare("SELECT count(*) AS count FROM teams WHERE leader_id='writer'").first("count")).toBe(0);
  });
  it("rejects a stale partial edit without reverting the winner", async () => {
    const first = await request("", "POST", input);
    const { team } = await first.json<{ team: { id: string; version: number } }>();
    const expectedVersion = team.version ?? 1;
    const winner = await request(`/${team.id}`, "PUT", { expectedVersion, title: "Winner" });
    expect(winner.status).toBe(200);
    const stale = await request(`/${team.id}`, "PUT", { expectedVersion, description: "Stale" });
    expect(stale.status).toBe(409);
    const row = await env.DB.prepare("SELECT title,description,version FROM teams WHERE id=?").bind(team.id).first();
    expect(row).toEqual({ title: "Winner", description: null, version: 2 });
  });
  it("accepts only one of two concurrent edits at the same version", async () => {
    const { team } = await (await request("", "POST", input)).json<{ team: { id: string; version: number } }>();
    const results = await Promise.all(["A", "B"].map(title => request(`/${team.id}`, "PUT", { expectedVersion: team.version, title })));
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(await env.DB.prepare("SELECT version FROM teams WHERE id=?").bind(team.id).first("version")).toBe(2);
  });
  it("replays a lost create response after the start time has passed", async () => {
    const { team } = await (await request("", "POST", input)).json<{ team: { id: string } }>();
    vi.spyOn(Date, "now").mockReturnValue(Date.parse(String(input.startAt)) + 1);
    const replay = await request("", "POST", input);
    expect(replay.status).toBe(201);
    expect((await replay.json<{ team: { id: string } }>()).team.id).toBe(team.id);
  });
  it("retains the operation identity after subsequent edits", async () => {
    const { team } = await (await request("", "POST", input)).json<{ team: { id: string; version: number } }>();
    expect((await request(`/${team.id}`, "PUT", { expectedVersion: team.version, title: "Edited" })).status).toBe(200);
    const replay = await request("", "POST", input);
    expect(replay.status).toBe(201);
    expect((await replay.json<{ team: { id: string; title: string } }>()).team).toMatchObject({ id: team.id, title: "Edited" });
  });
  it("rolls back a capacity violation without consuming the edit version", async () => {
    const { team } = await (await request("", "POST", input)).json<{ team: { id: string; version: number } }>();
    await env.DB.prepare("INSERT INTO users(id,name,email) VALUES ('member','Member','member@example.test')").run();
    await env.DB.prepare("INSERT INTO team_members(team_id,user_id) VALUES (?,'member')").bind(team.id).run();
    expect((await request(`/${team.id}`, "PUT", { expectedVersion: team.version, title: "Must not persist", maxParticipants: 1 })).status).toBe(409);
    expect(await env.DB.prepare("SELECT title,version FROM teams WHERE id=?").bind(team.id).first()).toEqual({ title: "Original", version: 1 });
  });
  it("does not reserve an identity for an invalid location", async () => {
    const invalid = await request("", "POST", { ...input, locationId: "missing" });
    expect(invalid.status).toBe(422);
    expect(await env.DB.prepare("SELECT count(*) AS count FROM team_create_requests").first("count")).toBe(0);
    expect((await request("", "POST", input)).status).toBe(201);
  });
  it("rejects old writes lacking operation identity or revision", async () => {
    const { requestId: _requestId, ...oldInput } = input;
    expect((await request("", "POST", oldInput)).status).toBe(400);
    const { team } = await (await request("", "POST", input)).json<{ team: { id: string } }>();
    expect((await request(`/${team.id}`, "PUT", { title: "Unversioned" })).status).toBe(400);
  });
  it("isolates the same request UUID between authenticated users", async () => {
    const first = await (await request("", "POST", input)).json<{ team: { id: string } }>();
    await env.DB.prepare(`INSERT INTO users(id,name,email,email_verified,extra) VALUES ('writer2','Writer2','writer2@example.test',1,'{"wechat":"writer2"}')`).run();
    const context = await createAuth(bindings()).$context;
    const session = await context.internalAdapter.createSession("writer2");
    headers.set("authorization", `Bearer ${session!.token}`);
    const second = await (await request("", "POST", input)).json<{ team: { id: string } }>();
    expect(second.team.id).not.toBe(first.team.id);
    expect(await env.DB.prepare("SELECT count(*) AS count FROM team_create_requests").first("count")).toBe(2);
  });
  it("rolls back both team and request identity when a later batch statement fails", async () => {
    const tagId = await env.DB.prepare("SELECT id FROM tags LIMIT 1").first<string>("id");
    await env.DB.prepare(`CREATE TRIGGER injected_team_tag_failure BEFORE INSERT ON team_tags
      BEGIN SELECT RAISE(ABORT,'injected failure'); END`).run();
    expect((await request("", "POST", { ...input, tagIds: [tagId] })).status).toBe(422);
    expect(await env.DB.prepare("SELECT count(*) AS count FROM teams WHERE leader_id='writer'").first("count")).toBe(0);
    expect(await env.DB.prepare("SELECT count(*) AS count FROM team_create_requests").first("count")).toBe(0);
    await env.DB.prepare("DROP TRIGGER injected_team_tag_failure").run();
    expect((await request("", "POST", { ...input, tagIds: [tagId] })).status).toBe(201);
  });
});
