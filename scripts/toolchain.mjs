import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const ROOT = new URL("../", import.meta.url);

function versionParts(value) {
  if (!/^\d+\.\d+\.\d+$/u.test(value)) {
    throw new Error(`需要精确稳定版本：${value}`);
  }
  return value.split(".").map(Number);
}

export function validateToolchain({
  nodeVersion,
  pnpmVersion,
  recommendedNode,
  minimumNode,
  packageManager,
  strict,
}) {
  const actual = versionParts(nodeVersion);
  versionParts(recommendedNode);
  const minimumMatch = /^>=(\d+\.\d+\.\d+)$/u.exec(minimumNode);
  const managerMatch = /^pnpm@(\d+\.\d+\.\d+)$/u.exec(packageManager);
  if (!minimumMatch || !managerMatch) {
    throw new Error(
      "工具链声明必须使用 engines.node >=x.y.z 和 packageManager pnpm@x.y.z",
    );
  }
  const minimum = versionParts(minimumMatch[1]);
  const difference =
    actual
      .map((part, index) => part - minimum[index])
      .find((part) => part !== 0) ?? 0;
  if (difference < 0)
    throw new Error(`Node ${nodeVersion} 不满足 ${minimumNode}`);
  if (pnpmVersion !== managerMatch[1]) {
    throw new Error(`pnpm 必须为 ${managerMatch[1]}，当前为 ${pnpmVersion}`);
  }
  if (nodeVersion !== recommendedNode) {
    const message = `Node 推荐版本为 ${recommendedNode}，当前为 ${nodeVersion}`;
    if (strict) throw new Error(message);
    return message;
  }
  return undefined;
}

export function checkToolchain({
  strict = process.env.WORKERS_CI === "1" ||
    ["1", "true"].includes(process.env.CI),
  warn = console.warn,
} = {}) {
  const pkg = JSON.parse(readFileSync(new URL("package.json", ROOT), "utf8"));
  // Query the same executable used by the build, rather than trusting version variables.
  const pnpmVersion = execFileSync(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--version"],
    { encoding: "utf8" },
  ).trim();
  const warning = validateToolchain({
    nodeVersion: process.versions.node,
    pnpmVersion,
    recommendedNode: readFileSync(
      new URL(".node-version", ROOT),
      "utf8",
    ).trim(),
    minimumNode: pkg.engines.node,
    packageManager: pkg.packageManager,
    strict,
  });
  if (warning) warn(warning);
  return `Node ${process.versions.node} / pnpm ${pnpmVersion}`;
}
