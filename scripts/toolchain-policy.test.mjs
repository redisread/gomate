import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("env check executes a standalone pnpm launcher directly", () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "gomate-pnpm-launcher-"));
  const launcher = join(fixtureRoot, "pnpm");
  writeFileSync(launcher, "#!/bin/sh\nprintf '99.1.0\\n'\n");
  chmodSync(launcher, 0o755);

  try {
    const result = spawnSync(
      process.execPath,
      ["scripts/env-check.mjs", "--ci"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          BETTER_AUTH_SECRET: "ci-test-secret-key-at-least-32-characters",
          npm_execpath: launcher,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /pnpm 99\.1\.0/u);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
