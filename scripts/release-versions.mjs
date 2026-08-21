#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const VERSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DEFAULT_ALLOWLIST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.github/production-version-allowlist.json",
);

export function assertWorkerVersionId(value) {
  const candidate = value?.trim();
  if (!candidate || !VERSION_ID_PATTERN.test(candidate)) {
    throw new Error("Worker version ID must be an exact UUID");
  }
  return candidate;
}

export function assertProductionVersionAllowed(
  value,
  { allowlistPath = DEFAULT_ALLOWLIST_PATH } = {},
) {
  const versionId = assertWorkerVersionId(value);
  const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
  if (allowlist?.schemaVersion !== 1 || !Array.isArray(allowlist.versionIds)) {
    throw new Error("Production version allowlist has an invalid schema");
  }
  const versionIds = allowlist.versionIds.map(assertWorkerVersionId);
  if (new Set(versionIds).size !== versionIds.length) {
    throw new Error("Production version allowlist contains duplicates");
  }
  if (!versionIds.includes(versionId)) {
    throw new Error(
      `Worker version ${versionId} is not approved for the current production schema`,
    );
  }
  return versionId;
}

export function assertExclusiveProductionVersionAllowed(
  value,
  { allowlistPath = DEFAULT_ALLOWLIST_PATH } = {},
) {
  const versionId = assertProductionVersionAllowed(value, { allowlistPath });
  const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
  if (
    allowlist.versionIds.length !== 1 ||
    allowlist.versionIds[0] !== versionId
  ) {
    throw new Error(
      "Production version allowlist must contain exactly the current compatible Worker before migration",
    );
  }
  return versionId;
}

function parseJsonLines(value) {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function parseVersionUploadOutput(value) {
  const uploads = parseJsonLines(value).filter(
    (entry) => entry?.type === "version-upload",
  );
  if (uploads.length !== 1) {
    throw new Error(
      "Wrangler output must contain exactly one version-upload event",
    );
  }
  const upload = uploads[0];
  const versionId = assertWorkerVersionId(
    upload.version_id ?? upload.versionId,
  );
  const workerName = upload.worker_name ?? upload.workerName;
  if (workerName !== "gomate-production-preview") {
    throw new Error("Uploaded version belongs to an unexpected Worker");
  }
  return { versionId, workerName };
}

export function parseActiveDeployment(value) {
  const deployments = JSON.parse(value);
  if (!Array.isArray(deployments) || deployments.length === 0) {
    throw new Error("Wrangler returned no active deployments");
  }
  const ordered = deployments
    .map((deployment) => {
      const createdOn = deployment?.created_on ?? deployment?.createdOn;
      const createdAt = Date.parse(createdOn);
      if (!Number.isFinite(createdAt)) {
        throw new Error("Every deployment must contain a valid created_on");
      }
      return { deployment, createdAt };
    })
    .sort((left, right) => right.createdAt - left.createdAt);
  if (ordered[1] && ordered[0].createdAt === ordered[1].createdAt) {
    throw new Error("Latest deployment timestamp is ambiguous");
  }
  const latest = ordered[0].deployment;
  const versions = latest?.versions;
  if (!Array.isArray(versions)) {
    throw new Error("Active deployment does not contain versions");
  }
  const serving = versions.filter(
    (version) => Number(version.percentage) === 100,
  );
  if (serving.length !== 1) {
    throw new Error("Active deployment must contain exactly one 100% version");
  }
  return {
    deploymentId: latest.id,
    versionId: assertWorkerVersionId(
      serving[0].version_id ?? serving[0].versionId ?? serving[0].id,
    ),
  };
}

function writeOutputs(values) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  appendFileSync(
    outputPath,
    Object.entries(values)
      .map(([name, value]) => `${name}=${value}\n`)
      .join(""),
  );
}

function runCli() {
  const [command, filePath] = process.argv.slice(2);
  if (command === "upload") {
    const inputPath = filePath ?? process.env.WRANGLER_OUTPUT_FILE_PATH;
    if (!inputPath) throw new Error("Wrangler output file path is required");
    const result = parseVersionUploadOutput(readFileSync(inputPath, "utf8"));
    writeOutputs({
      version_id: result.versionId,
      worker_name: result.workerName,
    });
    console.log(`Validated uploaded Worker version ${result.versionId}.`);
    return;
  }
  if (command === "active") {
    if (!filePath) throw new Error("Deployments JSON path is required");
    const result = parseActiveDeployment(readFileSync(filePath, "utf8"));
    writeOutputs({ version_id: result.versionId });
    console.log(`Validated active Worker version ${result.versionId}.`);
    return;
  }
  if (command === "validate") {
    const versionId = assertWorkerVersionId(process.env.WORKER_VERSION_ID);
    writeOutputs({ version_id: versionId });
    console.log(`Validated Worker version ${versionId}.`);
    return;
  }
  if (command === "compatible") {
    const versionId = assertProductionVersionAllowed(
      process.env.WORKER_VERSION_ID,
    );
    writeOutputs({ version_id: versionId });
    console.log(`Validated schema-compatible Worker version ${versionId}.`);
    return;
  }
  if (command === "exclusive") {
    const versionId = assertExclusiveProductionVersionAllowed(
      process.env.WORKER_VERSION_ID,
    );
    writeOutputs({ version_id: versionId });
    console.log(`Validated exclusive schema-compatible version ${versionId}.`);
    return;
  }
  throw new Error(
    "Usage: release-versions.mjs <upload|active|validate|compatible|exclusive> [file]",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    runCli();
  } catch (error) {
    console.error(`[release-versions] ${error.message}`);
    process.exit(1);
  }
}
