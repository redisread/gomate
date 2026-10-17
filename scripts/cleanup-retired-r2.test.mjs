import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { cleanupRetiredR2 } from "./cleanup-retired-r2.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
function fixture() {
  const bodies = new Map([
    ["stories/a.png", Buffer.from("a")],
    ["share/b.png", Buffer.from("b")],
    ["avatars/keep.png", Buffer.from("c")],
  ]);
  const objects = [...bodies].map(([key, body]) => ({
    key,
    size: body.length,
    etag: hash(body),
  }));
  const manifest = {
    bucket: "gomate",
    objects: objects.map(({ key, ...o }) => ({
      ...o,
      keyHash: hash(key),
      metadataHash: hash(JSON.stringify([{}, {}, "Standard"])),
      delete: !key.startsWith("avatars/"),
      sha256: hash(bodies.get(key)),
    })),
  };
  const removed = [];
  const api = {
    async list() {
      return objects.filter((o) => bodies.has(o.key));
    },
    async get(key) {
      return bodies.get(key);
    },
    async remove(key) {
      removed.push(key);
      bodies.delete(key);
    },
  };
  return { api, manifest, removed, bodies, checkReferences: async () => {} };
}
test("deletes exact approved objects, preserves avatar and safely resumes", async () => {
  const f = fixture();
  assert.deepEqual(await cleanupRetiredR2(f), { deleted: 2, alreadyAbsent: 0 });
  assert.ok(f.bodies.has("avatars/keep.png"));
  assert.deepEqual(await cleanupRetiredR2(f), { deleted: 0, alreadyAbsent: 2 });
  assert.equal(f.removed.length, 2);
});
test("content mismatch prevents every deletion", async () => {
  const f = fixture();
  f.bodies.set("share/b.png", Buffer.from("z"));
  await assert.rejects(cleanupRetiredR2(f), /content changed/);
  assert.deepEqual(f.removed, []);
});
test("new inventory, changed metadata and missing retained object fail closed", async () => {
  for (const kind of ["new", "changed", "missing"]) {
    const f = fixture();
    const list = f.api.list;
    f.api.list = async () => {
      const a = await list();
      if (kind === "new") a.push({ key: "locations/new", size: 1, etag: "a" });
      if (kind === "changed") a[0] = { ...a[0], etag: "changed" };
      return kind === "missing" ? a.slice(0, 2) : a;
    };
    await assert.rejects(cleanupRetiredR2(f));
    assert.deepEqual(f.removed, []);
  }
});
test("reference error or inventory permission error never becomes no references", async () => {
  for (const kind of ["references", "inventory"]) {
    const f = fixture();
    if (kind === "references")
      f.checkReferences = async () => {
        throw new Error("reference query failed");
      };
    else
      f.api.list = async () => {
        throw new Error("403");
      };
    await assert.rejects(cleanupRetiredR2(f));
    assert.deepEqual(f.removed, []);
  }
});
test("rechecks references after all body validation", async () => {
  const f = fixture();
  let calls = 0;
  f.checkReferences = async () => {
    if (++calls === 2) throw new Error("new reference");
  };
  await assert.rejects(cleanupRetiredR2(f), /new reference/);
  assert.deepEqual(f.removed, []);
});
test("partial deletion failure can resume without deleting retained data", async () => {
  const f = fixture();
  const remove = f.api.remove;
  f.api.remove = async (k) => {
    if (k === "share/b.png") throw new Error("503");
    await remove(k);
  };
  await assert.rejects(cleanupRetiredR2(f), /503/);
  f.api.remove = remove;
  const result = await cleanupRetiredR2(f);
  assert.equal(result.deleted, 1);
  assert.equal(result.alreadyAbsent, 1);
  assert.ok(f.bodies.has("avatars/keep.png"));
});
test("production integration runs only after successful deployment smoke", async () => {
  const source = await readFile(
    new URL("./deploy-production.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(
    source.indexOf("scripts/cleanup-retired-r2.mjs") >
      source.indexOf("scripts/smoke-production-write-boundary.mjs"),
  );
  const script = await readFile(
    new URL("./cleanup-retired-r2.mjs", import.meta.url),
    "utf8",
  );
  assert.ok(
    script.indexOf("  assertProductionDeployEnvironment();") <
      script.indexOf("  const { stdout }"),
  );
});
