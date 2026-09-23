import { env, exports } from "cloudflare:workers";
import {
  applyD1Migrations,
  type D1Migration,
} from "cloudflare:test";
import { describe, expect, it } from "vitest";

async function seedPosterDependencies() {
  await applyD1Migrations(
    env.DB,
    JSON.parse(env.TEST_MIGRATIONS) as D1Migration[],
  );

  const response = await env.ASSETS.fetch(
    new Request(
      "https://gomate.test/client/fonts/noto-sans-sc-chinese-simplified-400-normal.woff",
    ),
  );
  expect(response.status).toBe(200);
  await env.R2.put(
    "assets/fonts/noto-sans-400.woff",
    await response.arrayBuffer(),
  );
  const pngBytes = Uint8Array.from(
    atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
    (character) => character.charCodeAt(0),
  );
  const pngBody = new Response(pngBytes).body;
  expect(pngBody).not.toBeNull();
  const webp = await env.IMAGES
    .input(pngBody!)
    .output({ format: "image/webp" });
  const webpResponse = webp.response();
  expect(webpResponse.status).toBe(200);
  await env.R2.put("images/poster-cover.webp", await webpResponse.arrayBuffer(), {
    httpMetadata: { contentType: "image/webp" },
  });

  const region = await env.DB.prepare(
    "SELECT id FROM region WHERE level = 'city' AND service_enabled = 1 LIMIT 1",
  ).first<{ id: string }>();
  expect(region).not.toBeNull();

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users (id, name, email)
      VALUES ('poster-user', 'Victor', 'poster@example.test')`),
    env.DB.prepare(`INSERT INTO locations (
      id, region_id, name, slug, supported_activity_types, status,
      description, cover_image_url, images, extra
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "poster-location",
        region!.id,
        "惠州西湖",
        "poster-location",
        '["hiking"]',
        "published",
        "环湖散步，晚上探索美食",
        "images/poster-cover.webp",
        "[]",
        "{}",
      ),
    env.DB.prepare(`INSERT INTO teams (
      id, location_id, leader_id, activity_type, title, start_at, end_at,
      max_participants, requirements, recruitment_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(
        "poster-team",
        "poster-location",
        "poster-user",
        "hiking",
        "惠州西湖组队",
        Date.UTC(2026, 7, 30, 2),
        Date.UTC(2026, 7, 30, 10),
        6,
        "[]",
        "open",
      ),
  ]);
}

describe("share poster rendering in workerd", () => {
  it("renders team and location endpoints through the production Worker bundle", async () => {
    await seedPosterDependencies();

    for (const path of [
      "/api/share-image/team/poster-team",
      "/api/share-image/location/poster-location",
    ]) {
      const response = await exports.default.fetch(
        new Request(`https://gomate.test${path}`),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("image/svg+xml");
      await expect(response.text()).resolves.toMatch(/^<svg\b/);
    }
  });
});
