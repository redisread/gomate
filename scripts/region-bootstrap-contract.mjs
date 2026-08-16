import { readFileSync, writeFileSync } from "node:fs";

export const EXPECTED_REGION_IDS = [
  "region-cn",
  "region-cn-guangdong",
  "region-cn-shenzhen",
];

const EXPECTED_REGIONS = [
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

function integer(value, label) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return parsed;
}

export function assertBootstrapPreflight(input) {
  const businessRowCount = integer(
    input.businessRowCount,
    "businessRowCount",
  );
  const regionRowCount = integer(input.regionRowCount, "regionRowCount");
  if (businessRowCount !== 0) {
    throw new Error(`Refusing bootstrap: found ${businessRowCount} business rows`);
  }
  if (regionRowCount !== 0) {
    throw new Error(`Refusing bootstrap: found ${regionRowCount} existing Region rows`);
  }
}

export function assertBootstrapResult(input) {
  const businessRowCount = integer(
    input.businessRowCount,
    "businessRowCount",
  );
  if (businessRowCount !== 0) {
    throw new Error(`Postflight found ${businessRowCount} unexpected business rows`);
  }
  if (!Array.isArray(input.rows) || input.rows.length !== 3) {
    throw new Error("Postflight must return exactly three Region rows");
  }
  const actual = [...input.rows]
    .map((row) => ({
      id: row.id,
      parent_id: row.parent_id ?? null,
      country_code: row.country_code,
      level: row.level,
      timezone: row.timezone ?? null,
      center_latitude:
        row.center_latitude == null ? null : Number(row.center_latitude),
      center_longitude:
        row.center_longitude == null ? null : Number(row.center_longitude),
      service_enabled: Number(row.service_enabled),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const expected = [...EXPECTED_REGIONS].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Postflight does not match the reviewed Region hierarchy");
  }
}

function rowsFromWrangler(filePath) {
  const payload = JSON.parse(readFileSync(filePath, "utf8"));
  const executions = Array.isArray(payload) ? payload : [payload];
  if (executions.length !== 1 || executions[0]?.success !== true) {
    throw new Error("Wrangler D1 evidence is missing one successful execution");
  }
  const rows = executions[0]?.results;
  if (!Array.isArray(rows)) {
    throw new Error("Wrangler D1 evidence does not contain result rows");
  }
  return rows;
}

export function validatePreflightFile(filePath) {
  const rows = rowsFromWrangler(filePath);
  if (rows.length !== 1) {
    throw new Error("Preflight query must return exactly one row");
  }
  assertBootstrapPreflight({
    businessRowCount: rows[0].business_row_count,
    regionRowCount: rows[0].region_row_count,
  });
}

export function validatePostflightFiles(regionPath, countPath, evidencePath) {
  const rows = rowsFromWrangler(regionPath);
  const counts = rowsFromWrangler(countPath);
  if (counts.length !== 1) {
    throw new Error("Postflight count query must return exactly one row");
  }
  assertBootstrapResult({
    businessRowCount: counts[0].business_row_count,
    rows,
  });
  writeFileSync(
    evidencePath,
    `${JSON.stringify(
      {
        status: "complete",
        database: "gomate-db-v2",
        regionIds: EXPECTED_REGION_IDS,
        regions: rows,
        businessRowCount: Number(counts[0].business_row_count),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
}

if (process.argv[1]?.endsWith("region-bootstrap-contract.mjs")) {
  const [, , command, ...args] = process.argv;
  if (command === "preflight" && args.length === 1) {
    validatePreflightFile(args[0]);
  } else if (command === "postflight" && args.length === 3) {
    validatePostflightFiles(args[0], args[1], args[2]);
  } else {
    console.error(
      "Usage: region-bootstrap-contract.mjs preflight <json> | postflight <regions-json> <counts-json> <evidence-json>",
    );
    process.exit(1);
  }
}
