import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_REGION_IDS,
  assertBootstrapPreflight,
  assertBootstrapResult,
} from "./region-bootstrap-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("production Region bootstrap is exact, protected, and reversible", () => {
  const workflow = readFileSync(
    path.join(root, ".github/workflows/bootstrap-production-regions.yml"),
    "utf8",
  );
  const applyPath = path.join(root, "api/db/bootstrap/regions-v1.sql");
  const applySql = readFileSync(applyPath, "utf8");
  const rollbackSql = readFileSync(
    path.join(root, "api/db/bootstrap/regions-v1.rollback.sql"),
    "utf8",
  );
  const checksum = readFileSync(
    path.join(root, "api/db/bootstrap/regions-v1.sha256"),
    "utf8",
  );

  assert.deepEqual(EXPECTED_REGION_IDS, [
    "region-cn",
    "region-cn-guangdong",
    "region-cn-shenzhen",
  ]);
  for (const id of EXPECTED_REGION_IDS) {
    assert.match(applySql, new RegExp(`'${id}'`, "u"));
    assert.match(rollbackSql, new RegExp(`'${id}'`, "u"));
  }
  assert.equal((applySql.match(/INSERT INTO `region`/gu) ?? []).length, 1);
  assert.doesNotMatch(applySql, /INSERT OR|UPDATE|DELETE|users|locations|tags/iu);
  assert.doesNotMatch(rollbackSql, /DROP|UPDATE|INSERT/iu);
  assert.match(checksum, /^[0-9a-f]{64}\s+regions-v1\.sql\s*$/u);
  assert.equal(
    checksum.split(/\s+/u)[0],
    createHash("sha256").update(readFileSync(applyPath)).digest("hex"),
  );

  assert.match(workflow, /workflow_dispatch:[\s\S]*BOOTSTRAP_REGIONS/u);
  assert.match(
    workflow,
    /inputs\.confirm\s*==\s*'BOOTSTRAP_REGIONS'.*github\.ref\s*==\s*'refs\/heads\/main'/u,
  );
  assert.match(workflow, /environment:\s*production/u);
  assert.match(workflow, /CLOUDFLARE_ENV:\s*production/u);
  assert.match(workflow, /--env production --remote --config wrangler\.jsonc/u);
  assert.match(workflow, /sha256sum --check regions-v1\.sha256/u);
  assert.match(workflow, /actions\/upload-artifact@v4/u);
  assert.doesNotMatch(workflow, /seed\.sql|wrangler\s+deploy|wrangler\s+secret|wrangler\s+r2/iu);
});

test("preflight accepts only an empty V2 business database", () => {
  assert.doesNotThrow(() =>
    assertBootstrapPreflight({ businessRowCount: 0, regionRowCount: 0 }),
  );
  assert.throws(
    () => assertBootstrapPreflight({ businessRowCount: 1, regionRowCount: 0 }),
    /business rows/u,
  );
  assert.throws(
    () => assertBootstrapPreflight({ businessRowCount: 0, regionRowCount: 1 }),
    /Region rows/u,
  );
});

test("postflight accepts only the reviewed three-row hierarchy", () => {
  const rows = [
    {
      id: "region-cn",
      parent_id: null,
      country_code: "CN",
      level: "other",
      timezone: null,
      center_latitude: null,
      center_longitude: null,
      service_enabled: 0,
    },
    {
      id: "region-cn-guangdong",
      parent_id: "region-cn",
      country_code: "CN",
      level: "province",
      timezone: null,
      center_latitude: null,
      center_longitude: null,
      service_enabled: 0,
    },
    {
      id: "region-cn-shenzhen",
      parent_id: "region-cn-guangdong",
      country_code: "CN",
      level: "city",
      timezone: "Asia/Shanghai",
      center_latitude: 22.5431,
      center_longitude: 114.0579,
      service_enabled: 1,
    },
  ];
  assert.doesNotThrow(() =>
    assertBootstrapResult({ businessRowCount: 0, rows }),
  );
  assert.throws(
    () => assertBootstrapResult({ businessRowCount: 0, rows: rows.slice(0, 2) }),
    /exactly three/u,
  );
  assert.throws(
    () =>
      assertBootstrapResult({
        businessRowCount: 0,
        rows: rows.map((row) =>
          row.id === "region-cn-shenzhen"
            ? { ...row, timezone: "UTC" }
            : row,
        ),
      }),
    /reviewed Region hierarchy/u,
  );
});
