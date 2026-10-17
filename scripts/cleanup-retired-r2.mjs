import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assertProductionDeployEnvironment } from "./production-build-guard.mjs";

const exec = promisify(execFile);
const hash = (value) => createHash("sha256").update(value).digest("hex");
const stable = (v) =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, stable(v[k])]),
        )
      : v;
const metadataHash = (o) =>
  hash(
    JSON.stringify(
      stable([
        o.http_metadata ?? {},
        o.custom_metadata ?? {},
        o.storage_class ?? "Standard",
      ]),
    ),
  );
const ACCOUNT = "e3afbb613458022947cd9dc9f5bd6334";
export const REFERENCE_SQL = `WITH content(value) AS (
 SELECT coalesce(image,'')||coalesce(bio,'')||extra FROM users
 UNION ALL SELECT coalesce(cover_image_url,'')||images||extra||description FROM locations
 UNION ALL SELECT coalesce(description,'')||requirements||coalesce(meeting_point,'') FROM teams
) SELECT count(*) AS refs FROM content WHERE instr(value,'stories/')>0 OR instr(value,'share/')>0 OR instr(value,'incremental-cache/')>0;`;

// Fail closed when the inventory grows beyond this one reviewed batch.
function preflightInventory(objects, manifest) {
  const approved = new Map(manifest.objects.map((o) => [o.keyHash, o]));
  if (approved.size !== manifest.objects.length)
    throw new Error("Duplicate manifest entry");
  const seen = new Set();
  const targets = [];
  for (const object of objects) {
    const keyHash = hash(object.key);
    const expected = approved.get(keyHash);
    if (!expected || seen.has(keyHash))
      throw new Error("Unexpected inventory object");
    seen.add(keyHash);
    if (
      object.etag !== expected.etag ||
      Number(object.size) !== expected.size ||
      metadataHash(object) !== expected.metadataHash
    ) {
      throw new Error("Object fingerprint changed");
    }
    if (expected.delete) {
      if (!/^(stories|share|incremental-cache)\//u.test(object.key))
        throw new Error("Protected object selected");
      targets.push({ key: object.key, ...expected });
    }
  }
  for (const expected of approved.values()) {
    if (!expected.delete && !seen.has(expected.keyHash))
      throw new Error("Retained object missing");
  }
  return targets;
}

async function bounded(items, fn) {
  let next = 0;
  let failure;
  await Promise.all(
    Array.from({ length: 5 }, async () => {
      while (!failure && next < items.length) {
        const item = items[next++];
        try {
          await fn(item);
        } catch (error) {
          failure ??= error;
        }
      }
    }),
  );
  if (failure) throw failure;
}

export async function cleanupRetiredR2({
  api,
  manifest,
  checkReferences,
  progress = () => {},
}) {
  if (manifest.bucket !== "gomate") throw new Error("Unexpected bucket");
  await checkReferences();
  const targets = preflightInventory(await api.list(), manifest);
  // Validate every surviving candidate before the first deletion.
  await bounded(targets, async (object) => {
    const bytes = await api.get(object.key);
    if (bytes.length !== object.size || hash(bytes) !== object.sha256)
      throw new Error("Object content changed");
  });
  await checkReferences();
  preflightInventory(await api.list(), manifest);
  let deleted = 0;
  await bounded(targets, async (object) => {
    // These prefixes have no live writer. Recheck bytes immediately before delete.
    const bytes = await api.get(object.key);
    if (bytes.length !== object.size || hash(bytes) !== object.sha256)
      throw new Error("Object content changed");
    await api.remove(object.key);
    progress(++deleted);
  });
  const remaining = preflightInventory(await api.list(), manifest);
  if (remaining.length) throw new Error("Cleanup incomplete");
  return {
    deleted,
    alreadyAbsent: manifest.objects.filter((o) => o.delete).length - deleted,
  };
}

async function main() {
  assertProductionDeployEnvironment();
  const manifestSource = await readFile(
    new URL("./r2-cleanup-manifest.json", import.meta.url),
    "utf8",
  );
  if (
    hash(manifestSource) !==
    "7dbbe0de5d71e42cdad965542e1ae9e79003b614cdb66ffbc59677f8b1233047"
  )
    throw new Error("Unapproved manifest bytes");
  const manifest = JSON.parse(manifestSource);
  if (
    manifest.objects.length !== 947 ||
    manifest.objects.filter((o) => o.delete).length !== 781
  )
    throw new Error("Unapproved cleanup scope");
  const { stdout } = await exec("wrangler", ["auth", "token", "--json"], {
    maxBuffer: 1024 * 1024,
  });
  const { token } = JSON.parse(stdout);
  if (!token) throw new Error("Missing build credentials");
  const base = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/gomate/objects`;
  async function request(url, method = "GET") {
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok)
      throw new Error(`R2 ${method} failed: ${response.status}`);
    return response;
  }
  const api = {
    async list() {
      const data = await (await request(`${base}?per_page=1000`)).json();
      if (
        !data.success ||
        !Array.isArray(data.result) ||
        data.result.length >= 1000 ||
        data.result_info?.cursor
      )
        throw new Error("Incomplete R2 inventory");
      return data.result;
    },
    async get(key) {
      const response = await request(`${base}/${encodeURIComponent(key)}`);
      const size = Number(response.headers.get("content-length"));
      if (!Number.isFinite(size) || size > 2 * 1024 * 1024)
        throw new Error("Unexpected object size");
      const chunks = [];
      let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length;
        if (length > 2 * 1024 * 1024) throw new Error("Unexpected object size");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    },
    async remove(key) {
      const result = await (
        await request(`${base}/${encodeURIComponent(key)}`, "DELETE")
      ).json();
      if (!result.success) throw new Error("R2 delete rejected");
    },
  };
  async function checkReferences() {
    const { stdout: output } = await exec(
      "wrangler",
      [
        "d1",
        "execute",
        "DB",
        "--remote",
        "--env",
        "production",
        "--config",
        "wrangler.jsonc",
        "--command",
        REFERENCE_SQL,
        "--json",
      ],
      { maxBuffer: 1024 * 1024 },
    );
    const result = JSON.parse(output);
    if (
      result.length !== 1 ||
      !result[0].success ||
      result[0].results?.length !== 1 ||
      result[0].results[0].refs !== 0
    )
      throw new Error(
        "Retired media still referenced or reference query failed",
      );
  }
  const result = await cleanupRetiredR2({
    api,
    manifest,
    checkReferences,
    progress(count) {
      if (count % 100 === 0)
        console.log(`R2 cleanup deleted ${count} approved objects`);
    },
  });
  console.log(
    JSON.stringify({
      event: "retired_r2_cleanup_completed",
      ...result,
      retained: 166,
    }),
  );
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error(
      "Retired R2 cleanup stopped; inspect counts and rerun only via protected main build",
    );
    process.exitCode = 1;
  });
}
