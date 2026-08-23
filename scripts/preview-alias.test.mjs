import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_DNS_LABEL_LENGTH,
  previewAliasForBranch,
} from "./preview-alias.mjs";

test("creates a stable DNS-safe alias for a branch", () => {
  const alias = previewAliasForBranch("Feature/Preview_URL");

  assert.equal(alias, previewAliasForBranch("Feature/Preview_URL"));
  assert.match(alias, /^[a-z][a-z0-9-]*$/u);
  assert.ok(alias.length + 1 + "gomate".length <= MAX_DNS_LABEL_LENGTH);
});

test("keeps normalized branch collisions distinct", () => {
  assert.notEqual(
    previewAliasForBranch("feature/a"),
    previewAliasForBranch("feature-a"),
  );
});

test("bounds long and non-ASCII branch names", () => {
  const alias = previewAliasForBranch(`${"很长的分支名/".repeat(30)}release`);

  assert.match(alias, /^[a-z][a-z0-9-]*$/u);
  assert.ok(alias.length + 1 + "gomate".length <= MAX_DNS_LABEL_LENGTH);
});

test("does not create an alias for main", () => {
  assert.throws(() => previewAliasForBranch("main"), /main/u);
});
