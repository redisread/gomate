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
