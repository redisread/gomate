import { createHash } from "node:crypto";

export const DEFAULT_WORKER_NAME = "gomate";
export const MAX_DNS_LABEL_LENGTH = 63;
export const PREVIEW_WRANGLER_CONFIG = "dist/server/wrangler.json";

function branchHash(branch) {
  return createHash("sha256").update(branch, "utf8").digest("hex").slice(0, 8);
}

function branchSlug(branch) {
  const ascii = branch.normalize("NFKD").replace(/[^\p{ASCII}]/gu, "");
  return ascii.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "branch";
}

export function previewAliasForBranch(
  branch,
  workerName = DEFAULT_WORKER_NAME,
) {
  if (typeof branch !== "string" || branch.trim() === "") {
    throw new Error("Preview alias requires WORKERS_CI_BRANCH");
  }
  if (branch === "main") {
    throw new Error("Preview aliases are not created for main");
  }
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(workerName)) {
    throw new Error("Worker name must be a DNS-compatible label");
  }

  const hash = branchHash(branch);
  const prefix = `b-${branchSlug(branch)}`;
  const maxAliasLength = MAX_DNS_LABEL_LENGTH - workerName.length - 1;
  const slugLength = Math.max(1, maxAliasLength - prefix.length - 1 - hash.length);
  const trimmedPrefix = prefix.slice(0, prefix.length - branchSlug(branch).length + slugLength).replace(/-+$/u, "");
  return `${trimmedPrefix}-${hash}`;
}

export function previewWranglerCommand(alias) {
  if (!/^[a-z][a-z0-9-]*$/u.test(alias)) {
    throw new Error("Preview alias is not DNS-compatible");
  }
  return [
    "versions",
    "upload",
    "--env",
    "production",
    "--config",
    PREVIEW_WRANGLER_CONFIG,
    "--keep-vars",
    "--var",
    "WRITE_MODE:protected",
    "--preview-alias",
    alias,
  ];
}
