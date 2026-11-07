import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("runs the required validation job only for pull requests targeting main", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );

  assert.match(workflow, /^on:\n {2}pull_request:\n {4}branches: \[main\]$/mu);
  assert.doesNotMatch(workflow, /^ {2}push:/mu);
  assert.match(workflow, /^ {2}validate:$/mu);
});

test("labels pull requests from trusted path rules", async () => {
  const [workflow, config] = await Promise.all([
    readFile(
      new URL("../.github/workflows/labeler.yml", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../.github/labeler.yml", import.meta.url), "utf8"),
  ]);

  assert.match(workflow, /^ {2}pull_request_target:$/mu);
  assert.match(workflow, /^ {2}contents: read$/mu);
  assert.match(workflow, /^ {2}pull-requests: write$/mu);
  assert.match(workflow, /^ {2}issues: write$/mu);
  assert.match(workflow, /uses: actions\/github-script@v9/u);
  assert.match(workflow, /github\.rest\.issues\.createLabel/u);
  assert.match(workflow, /uses: actions\/labeler@v7/u);
  assert.match(workflow, /^ {10}sync-labels: true$/mu);
  assert.doesNotMatch(workflow, /actions\/checkout|^\s*run:/mu);

  for (const [label, representativePath] of [
    ["frontend", "src/components/**"],
    ["backend", "src/server/**"],
    ["database", "migrations/**"],
    ["i18n", "public/locales/**"],
    ["tests", "e2e/**"],
    ["actions", ".github/workflows/**"],
    ["dependencies", "pnpm-lock.yaml"],
    ["documentation", "docs/**"],
  ]) {
    assert.match(config, new RegExp(`^${label}:$`, "mu"));
    assert.ok(config.includes(`- "${representativePath}"`));
    assert.ok(workflow.includes(`name: "${label}"`));
  }
});

test("CI reads toolchain declarations and checks actual versions before install", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /node-version-file: \.node-version/u);
  assert.doesNotMatch(workflow, /node-version:|version: 12\.14\.0/u);
  const checkIndex = workflow.indexOf("run: node scripts/check-toolchain.mjs");
  assert.ok(
    checkIndex >= 0 && checkIndex < workflow.indexOf("run: pnpm install"),
  );
});

test("parallel jobs preserve every application gate and both E2E shards", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const { scripts } = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  for (const command of scripts["test:ci"].split(" && ")) {
    assert.ok(
      workflow.includes(`run: ${command}\n`),
      `Missing CI gate: ${command}`,
    );
  }
  for (const command of [
    "pnpm audit --prod --audit-level high",
    "pnpm worker:types",
    "pnpm worker:dry-run",
    "pnpm worker:size",
  ]) {
    assert.ok(
      workflow.includes(`run: ${command}\n`),
      `Missing CI gate: ${command}`,
    );
  }
  assert.match(workflow, /needs: \[checks, database, worker, e2e\]/u);
  assert.match(workflow, /fail-fast: false/u);
  assert.match(workflow, /shard: \[1, 2\]/u);
  assert.match(
    workflow,
    /pnpm test:e2e:ci --shard=\$\{\{ matrix.shard \}\}\/2/u,
  );
  assert.match(workflow, /gomate-e2e-\$\{\{ matrix.shard \}\}/u);
  assert.doesNotMatch(workflow, /continue-on-error|paths-ignore:|paths:/u);
});

test("required aggregate rejects failed, cancelled, skipped and missing jobs", async () => {
  const { spawnSync } = await import("node:child_process");
  const workflow = await readFile(
    new URL("../.github/workflows/ci.yml", import.meta.url),
    "utf8",
  );
  const aggregate = workflow.split("\n  validate:\n")[1];
  assert.match(aggregate, /if: \$\{\{ always\(\) \}\}/u);
  const script = aggregate
    .split("run: |\n")[1]
    .split("\n")
    .map((line) => line.replace(/^ {10}/u, ""))
    .join("\n");
  const jobs = ["CHECKS", "DATABASE", "WORKER", "E2E"];
  const success = Object.fromEntries(jobs.map((job) => [job, "success"]));
  assert.equal(
    spawnSync("sh", ["-eu", "-c", script], { env: success }).status,
    0,
  );
  for (const job of jobs) {
    assert.ok(
      aggregate.includes(
        job + ": ${{ needs." + job.toLowerCase() + ".result }}",
      ),
    );
    for (const result of ["failure", "cancelled", "skipped", ""]) {
      assert.notEqual(
        spawnSync("sh", ["-eu", "-c", script], {
          env: { ...success, [job]: result },
        }).status,
        0,
        `${job}=${result} must block`,
      );
    }
  }
});
