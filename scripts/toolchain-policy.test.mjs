import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const envCheck = readFileSync("scripts/env-check.mjs", "utf8");
const agentRules = readFileSync("AGENTS.md", "utf8");
const workspace = readFileSync("pnpm-workspace.yaml", "utf8");
const workflows = readdirSync(".github/workflows")
  .filter((name) => /\.ya?ml$/u.test(name))
  .map((name) => readFileSync(`.github/workflows/${name}`, "utf8"))
  .join("\n");

test("accepts the installed pnpm version without a repository major-version pin", () => {
  assert.equal(packageJson.engines?.pnpm, undefined);
  assert.equal(packageJson.packageManager, undefined);
  assert.doesNotMatch(
    envCheck,
    /expectedPnpmMajor|pnpmMajor\s*!==|packageManager/u,
  );
  assert.doesNotMatch(agentRules, /pnpm@9|pnpm\s*9\.x|锁定的.*pnpm/u);
});

test("keeps pnpm security and native-build policy in workspace settings", () => {
  assert.match(workspace, /^allowBuilds:\n(?:  .+: true\n){4}/mu);
  assert.doesNotMatch(workspace, /^onlyBuiltDependencies:/mu);
  assert.match(workspace, /^overrides:/mu);
  assert.equal(packageJson.pnpm, undefined);
});

test("CI validates the latest pnpm without restoring a major-version pin", () => {
  assert.doesNotMatch(workflows, /pnpm\/action-setup/u);
  const setupSteps = workflows.match(/pnpm\/setup@v1/gu) ?? [];
  const configuredSteps =
    workflows.match(
      /- uses: pnpm\/setup@v1\n\s+with:\n\s+version: latest\n\s+install: false/gu,
    ) ?? [];
  assert.ok(setupSteps.length > 0);
  assert.equal(configuredSteps.length, setupSteps.length);
});
