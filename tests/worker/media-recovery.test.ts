import { env } from "cloudflare:workers";
import { applyD1Migrations, reset } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { beginMediaWrite, completeMediaWrite, recoverMediaObjects, registerExistingMedia } from "../../src/server/lib/media-recovery";

import accountRoute from "../../src/server/routes/users/account";
import { createAuth } from "../../src/server/lib/auth";
import { uploadRoute } from "../../src/server/routes/upload";
import locationMutations from "../../src/server/routes/locations/mutations";

const base = "https://media.example.test";
const key = "avatars/media-user/example.webp";
const url = `${base}/${key}`;
const now = 1_800_000_000_000;
const bindings = () => ({ ...env, WRITE_MODE: "open", APP_URL: "https://gomate.live", R2_PUBLIC_URL: base,
  BETTER_AUTH_SECRET: "media-test-secret-at-least-thirty-two-characters" });
async function authHeaders() {
  const context = await createAuth(bindings()).$context;
  const session = await context.internalAdapter.createSession("media-user");
  return { authorization: `Bearer ${session!.token}`, origin: "https://gomate.live" };
}

beforeEach(async () => {
  await applyD1Migrations(env.DB, JSON.parse(env.TEST_MIGRATIONS as string));
  await env.DB.prepare("INSERT INTO users (id,name,email,email_verified) VALUES ('media-user','Media','media@example.test',1)").run();
});
afterEach(() => reset());

async function state() {
  return env.DB.prepare("SELECT state FROM media_objects WHERE key = ?").bind(key).first("state");
}

describe("durable media recovery", () => {
  it("retains an interrupted put for reconciliation instead of assuming it completed", async () => {
    await beginMediaWrite(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await state()).toBe("blocked");
    expect(await env.R2.head(key)).not.toBeNull();
  });

  it("preserves referenced objects and cleans them after the reference is removed", async () => {
    await beginMediaWrite(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await completeMediaWrite(bindings(), key, now);
    await env.DB.prepare("UPDATE users SET image = ? WHERE id = 'media-user'").bind(url).run();
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await env.R2.head(key)).not.toBeNull();
    await env.DB.prepare("UPDATE users SET image = NULL WHERE id = 'media-user'").run();
    await recoverMediaObjects(bindings(), now + 4 * 86_400_000);
    expect(await env.R2.head(key)).toBeNull();
    expect(await state()).toBe("done");
    await expect(env.DB.prepare("UPDATE users SET image = ? WHERE id = 'media-user'").bind(url).run()).rejects.toThrow(/media_reference_unavailable/);
  });

  it("resumes deletion after a process stops between claim and R2 deletion", async () => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await env.DB.prepare("UPDATE media_objects SET state='deleting', next_attempt_at=? WHERE key=?").bind(now, key).run();
    await Promise.all([recoverMediaObjects(bindings(), now + 1), recoverMediaObjects(bindings(), now + 1)]);
    expect(await env.R2.head(key)).toBeNull();
    expect(await state()).toBe("done");
  });

  it("does not write or delete in protected mode", async () => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await recoverMediaObjects({ ...bindings(), WRITE_MODE: "protected" }, now + 2 * 86_400_000);
    expect(await env.R2.head(key)).not.toBeNull();
    expect(await state()).toBe("ready");
  });

  it("does not delete an unregistered historical object", async () => {
    await env.R2.put(key, "image");
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await env.R2.head(key)).not.toBeNull();
  });
  it("bounds failed deletions and preserves the exact object for intervention", async () => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    const failingBucket = new Proxy(env.R2, {
      get(target, property) {
        if (property === "delete") return async () => { throw new Error("Injected storage failure"); };
        return Reflect.get(target, property);
      },
    });
    for (let attempt = 1; attempt <= 9; attempt++) {
      await recoverMediaObjects({ ...bindings(), R2: failingBucket }, now + attempt * 86_400_000);
    }
    expect(await state()).toBe("blocked");
    expect(await env.DB.prepare("SELECT attempts FROM media_objects WHERE key=?").bind(key).first("attempts")).toBe(8);
    expect(await env.R2.head(key)).not.toBeNull();
  });

  it("fences location cover/gallery references and local avatar aliases after a claim", async () => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.DB.prepare("UPDATE media_objects SET state='deleting' WHERE key=?").bind(key).run();
    await expect(env.DB.prepare("UPDATE locations SET cover_image_url=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(url).run()).rejects.toThrow(/media_reference_unavailable/);
    await expect(env.DB.prepare("UPDATE locations SET images=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(JSON.stringify([url])).run()).rejects.toThrow(/media_reference_unavailable/);
    await expect(env.DB.prepare("UPDATE users SET image=? WHERE id='media-user'")
      .bind(`http://localhost:5432/api/r2/${key}`).run()).rejects.toThrow(/media_reference_unavailable/);
    await expect(env.DB.prepare("INSERT INTO users(id,name,email,image) VALUES ('other','Other','other@example.test',?)")
      .bind(url).run()).rejects.toThrow(/media_reference_unavailable/);
  });

  it("protects canonical objects referenced by a location gallery", async () => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await env.DB.prepare("UPDATE locations SET images=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(JSON.stringify([url])).run();
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await state()).toBe("ready");
    expect(await env.R2.head(key)).not.toBeNull();
  });

  it("keeps avatar removal committed when R2 is temporarily unavailable, then recovers", async () => {
    await env.R2.put(key, "image");
    await env.DB.prepare("UPDATE users SET image=? WHERE id='media-user'").bind(url).run();
    const failingBucket = new Proxy(env.R2, {
      get(target, property) {
        if (property === "delete") return async () => { throw new Error("Injected storage failure"); };
        return Reflect.get(target, property);
      },
    });
    const response = await uploadRoute.request(`/avatar?key=${encodeURIComponent(key)}`,
      { method: "DELETE", headers: await authHeaders() }, { ...bindings(), R2: failingBucket });
    expect(response.status).toBe(200);
    expect(await env.DB.prepare("SELECT image FROM users WHERE id='media-user'").first("image")).toBeNull();
    expect(await env.R2.head(key)).not.toBeNull();
    expect(await state()).toBe("deleting");
    await recoverMediaObjects(bindings(), Date.now() + 86_400_000);
    expect(await env.R2.head(key)).toBeNull();
    expect(await state()).toBe("done");
  });

  it("removes the location reference before any R2 deletion, without backup writes", async () => {
    await env.DB.prepare("UPDATE users SET role='admin' WHERE id='media-user'").run();
    const locationId = await env.DB.prepare("SELECT id FROM locations LIMIT 1").first<string>("id");
    const locationKey = `locations/${locationId}/photo.webp`;
    await env.R2.put(locationKey, "image");
    await env.DB.prepare("UPDATE locations SET cover_image_url=?, images='[]' WHERE id=?")
      .bind(`${base}/${locationKey}`, locationId).run();
    let deletions = 0;
    const checkedBucket = new Proxy(env.R2, {
      get(target, property) {
        if (property === "delete") return async (targetKey: string) => {
          expect(await env.DB.prepare("SELECT id FROM locations WHERE id=?").bind(locationId).first()).toBeNull();
          deletions++;
          await target.delete(targetKey);
        };
        if (property === "put") return async () => { throw new Error("No deletion backup should be written"); };
        return Reflect.get(target, property);
      },
    });
    const response = await locationMutations.request(`/${locationId}?permanent=true&confirm=${locationId}`,
      { method: "DELETE", headers: await authHeaders() }, { ...bindings(), R2: checkedBucket });
    expect(response.status).toBe(200);
    expect(deletions).toBe(1);
    expect(await env.R2.head(locationKey)).toBeNull();
  });

  it("rejects references before put completion and non-canonical aliases", async () => {
    await beginMediaWrite(bindings(), key, url, now);
    await expect(env.DB.prepare("UPDATE users SET image=? WHERE id='media-user'").bind(url).run())
      .rejects.toThrow(/media_reference_unavailable/);
    await completeMediaWrite(bindings(), key, now);
    for (const alias of [`${base}/avatars/./media-user/example.webp`, `${url}?download=1`, `${base}/avatars/media-user/%65xample.webp`]) {
      await expect(env.DB.prepare("UPDATE users SET image=? WHERE id='media-user'").bind(alias).run())
        .rejects.toThrow(/media_reference_unavailable/);
    }
  });

  it("account erasure preserves an avatar still referenced by a location", async () => {
    await env.R2.put(key, "image");
    await env.DB.prepare("UPDATE users SET image=? WHERE id='media-user'").bind(url).run();
    await env.DB.prepare("UPDATE locations SET cover_image_url=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(url).run();
    const response = await accountRoute.request("/me", {
      method: "DELETE", headers: { ...await authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }, bindings());
    expect(response.status).toBe(200);
    expect(await env.DB.prepare("SELECT status FROM users WHERE id='media-user'").first("status")).toBe("deleted");
    expect(await env.DB.prepare("SELECT count(*) AS count FROM sessions WHERE user_id='media-user'").first("count")).toBe(0);
    expect(await env.R2.head(key)).not.toBeNull();
  });

  it("account erasure persists media cleanup when object deletion fails", async () => {
    await env.R2.put(key, "image");
    await env.DB.prepare("UPDATE users SET image=? WHERE id='media-user'").bind(url).run();
    const failingBucket = new Proxy(env.R2, {
      get(target, property) {
        if (property === "delete") return async () => { throw new Error("Injected storage failure"); };
        return Reflect.get(target, property);
      },
    });
    const response = await accountRoute.request("/me", {
      method: "DELETE", headers: { ...await authHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ confirmation: "DELETE" }),
    }, { ...bindings(), R2: failingBucket });
    expect(response.status).toBe(200);
    expect(await state()).toBe("deleting");
    expect(await env.DB.prepare("SELECT status FROM users WHERE id='media-user'").first("status")).toBe("deleted");
    await recoverMediaObjects(bindings(), Date.now() + 86_400_000);
    expect(await env.R2.head(key)).toBeNull();
  });

  const historicalAliases = [
    "https://media.example.test:443/avatars/media-user/example.webp?download=1",
    "https://%6dedia.example.test/avatars/media-user/example.webp?download=1",
    "https://MEDIA.EXAMPLE.TEST:443/avatars/media-user/example.webp?download=1",
    "https://user:pass@media.example.test/avatars/media-user/example.webp?download=1",
    String.raw`https:\\media.example.test\avatars\media-user\example.webp`,
    "https://media.example.test:443/avatars/./media-user/%65xample.webp",
    "https://media.example.test:443/avatars/other/../media-user/example.webp",
    "https://media.example.test:443/%61vatars/media-user/example.webp",
    "https://media.example.test/avatars/media-user/exam\tple.webp",
    "https://media.example.test/avatars/media-user/exam\nple.webp",
    "https://media.example.test/avatars/media-user/exam\rple.webp",
    " https://media.example.test/avatars/media-user/example.webp ",
  ];

  it.each(historicalAliases)("preserves a historical URL alias: %s", async (alias) => {
    // A previous Worker accepted this URL before the object entered the ledger.
    await env.DB.prepare("UPDATE locations SET cover_image_url=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(alias).run();
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await env.R2.head(key)).not.toBeNull();
    expect(await state()).toBe("ready");
  });

  it.each(historicalAliases)("fences alias insertion after a deletion claim: %s", async (alias) => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.DB.prepare("UPDATE media_objects SET state='deleting' WHERE key=?").bind(key).run();
    await expect(env.DB.prepare("UPDATE locations SET images=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(JSON.stringify([alias])).run()).rejects.toThrow(/media_reference_unavailable/);
  });

  it("allows known external CDN query URLs without treating them as managed references", async () => {
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await env.DB.prepare("UPDATE locations SET images=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(JSON.stringify([
        "https://cdn.discordapp.com/avatars/media-user/example.webp?size=200",
        "https://lh3.googleusercontent.com/image?size=200",
        "https://raw.githubusercontent.com/image%20name.webp?raw=1",
      ])).run();
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await env.R2.head(key)).toBeNull();
    expect(await state()).toBe("done");
  });

  const c0Aliases = Array.from({ length: 33 }, (_, code) => {
    const control = String.fromCharCode(code);
    const label = `U+${code.toString(16).padStart(4, "0")}`;
    return [
      { label: `${label} prefix`, alias: `${control}${url}` },
      { label: `${label} suffix`, alias: `${url}${control}` },
      { label: `${label} mixed`, alias: `${String.fromCharCode(0, 1, 8)}${control}${url}${control}${String.fromCharCode(11, 12, 31, 32)}` },
    ];
  }).flat();

  it.each(c0Aliases)("preserves every URL-parser C0 alias: $label", async ({ alias }) => {
    // Prove this is an alias of the same object, not merely malformed input.
    expect(new URL(alias).href).toBe(url);
    await env.DB.prepare("UPDATE locations SET cover_image_url=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(alias).run();
    await registerExistingMedia(bindings(), key, url, now);
    await env.R2.put(key, "image");
    await recoverMediaObjects(bindings(), now + 2 * 86_400_000);
    expect(await env.R2.head(key)).not.toBeNull();
    expect(await state()).toBe("ready");
  });

  it.each(c0Aliases)("fences every URL-parser C0 alias: $label", async ({ alias }) => {
    expect(new URL(alias).href).toBe(url);
    await registerExistingMedia(bindings(), key, url, now);
    await env.DB.prepare("UPDATE media_objects SET state='deleting' WHERE key=?").bind(key).run();
    await expect(env.DB.prepare("UPDATE locations SET images=? WHERE id=(SELECT id FROM locations LIMIT 1)")
      .bind(JSON.stringify([alias])).run()).rejects.toThrow(/media_reference_unavailable/);
  });

});
