import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const envCheck = readFileSync("scripts/env-check.mjs", "utf8");
const agentRules = readFileSync("AGENTS.md", "utf8");
const workspace = readFileSync("pnpm-workspace.yaml", "utf8");

test("accepts the installed pnpm version without a repository major-version pin", () => {
  assert.equal(packageJson.engines?.pnpm, undefined);
  assert.equal(packageJson.packageManager, undefined);
  assert.doesNotMatch(envCheck, /expectedPnpmMajor|pnpmMajor\s*!==|packageManager/u);
  assert.doesNotMatch(agentRules, /pnpm@9|pnpm\s*9\.x|锁定的.*pnpm/u);
});

test("keeps pnpm security and native-build policy in workspace settings", () => {
  assert.match(workspace, /^allowBuilds:\n(?:  .+: true\n){4}/mu);
  assert.doesNotMatch(workspace, /^onlyBuiltDependencies:/mu);
  assert.match(workspace, /^overrides:/mu);
  assert.equal(packageJson.pnpm, undefined);
});
