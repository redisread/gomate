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
