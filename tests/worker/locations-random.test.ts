import { env, exports } from "cloudflare:workers";
import { reset } from "cloudflare:test";
import { afterEach, expect, it } from "vitest";
import { buildRandomLocationSql } from "../../src/server/routes/locations/random-query";
afterEach(() => reset());
async function setup() {
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE region (id TEXT PRIMARY KEY, name TEXT, level TEXT, service_enabled INTEGER)",
    ),
    env.DB.prepare(
      "CREATE TABLE locations (id TEXT PRIMARY KEY, name TEXT, cover_image_url TEXT, region_id TEXT, status TEXT)",
    ),
    env.DB.prepare(
      "INSERT INTO region VALUES ('city','城市','city',1),('off','关闭','city',0),('province','省','province',1)",
    ),
    env.DB.prepare(
      "INSERT INTO locations VALUES ('a','A',NULL,'city','published'),('b','B',NULL,'city','published'),('draft','草稿',NULL,'city','draft'),('off','关闭',NULL,'off','published'),('province','省',NULL,'province','published')",
    ),
  ]);
}
const draw = (recent: string[]) =>
  env.DB.prepare(buildRandomLocationSql(recent))
    .bind(...recent)
    .first<{ id: string; total: number; coverImageUrl: string | null }>();
it("excludes nonpublic places and includes places with no cover or coordinates", async () => {
  await setup();
  expect(await draw(["a"])).toMatchObject({
    id: "b",
    total: 2,
    coverImageUrl: null,
  });
  expect(await draw(["b"])).toMatchObject({ id: "a", total: 2 });
});
it("relaxes oldest eligible history first and ignores stale IDs", async () => {
  await setup();
  expect(await draw(["gone", "b", "a"])).toMatchObject({ id: "b" });
  expect(await draw(["a", "b"])).toMatchObject({ id: "a" });
});
it("handles empty and singleton catalogs", async () => {
  await setup();
  await env.DB.prepare("DELETE FROM locations WHERE id = 'b'").run();
  expect(await draw(["a"])).toMatchObject({ id: "a", total: 1 });
  await env.DB.prepare("DELETE FROM locations").run();
  expect(await draw([])).toBeNull();
});
it("can reach every eligible unseen place", async () => {
  await setup();
  const seen = new Set();
  for (let i = 0; i < 64; i++) seen.add((await draw([]))?.id);
  expect([...seen].sort()).toEqual(["a", "b"]);
});

it("serves the random contract without cache through the real Worker", async () => {
  await setup();
  const response = await exports.default.fetch(
    new Request("https://gomate.test/api/locations/random?recent=a"),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.json()).toEqual({
    success: true,
    location: { id: "b", name: "B", city: "城市", coverImageUrl: null },
    total: 2,
  });
});
it("rejects oversized or duplicate recent histories before touching D1", async () => {
  for (const recent of [
    "a,a",
    Array.from({ length: 11 }, (_, i) => String(i)).join(","),
    "x".repeat(129),
  ]) {
    const response = await exports.default.fetch(
      new Request(`https://gomate.test/api/locations/random?recent=${recent}`),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
