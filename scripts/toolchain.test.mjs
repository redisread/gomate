import assert from "node:assert/strict";
import test from "node:test";
import { validateToolchain } from "./toolchain.mjs";

const baseline = {
  nodeVersion: "24.22.0",
  pnpmVersion: "12.14.0",
  recommendedNode: "24.22.0",
  minimumNode: ">=22.23.3",
  packageManager: "pnpm@12.14.0",
  strict: false,
};
const check = (changes) => validateToolchain({ ...baseline, ...changes });

test("rejects Node below the minimum including minor and patch boundaries", () => {
  for (const nodeVersion of ["21.99.99", "22.0.0", "22.23.2"]) {
    assert.throws(() => check({ nodeVersion }), /不满足/u);
  }
});
test("local compatible Node versions warn while the pinned version passes", () => {
  for (const nodeVersion of ["22.23.3", "22.24.0", "24.19.0", "25.0.0"]) {
    assert.match(check({ nodeVersion }), /Node 推荐版本/u);
  }
  assert.equal(check({}), undefined);
});
test("strict builds reject compatible but unpinned Node versions", () => {
  assert.throws(
    () => check({ nodeVersion: "24.19.0", strict: true }),
    /Node 推荐版本/u,
  );
  assert.equal(check({ strict: true }), undefined);
});
test("pnpm must match in both local and strict modes", () => {
  for (const strict of [true, false]) {
    assert.throws(
      () => check({ pnpmVersion: "12.13.0", strict }),
      /pnpm 必须/u,
    );
  }
});
test("unsupported version declarations and prereleases fail closed", () => {
  for (const changes of [
    { nodeVersion: "24.22.0-rc.1" },
    { recommendedNode: "24" },
    { minimumNode: "^22" },
    { packageManager: "pnpm@^12" },
    { packageManager: "npm@12.14.0" },
  ])
    assert.throws(() => check(changes));
});
