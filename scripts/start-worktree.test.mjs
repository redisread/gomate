import assert from "node:assert/strict";
import test from "node:test";

import { readWranglerConfig } from "./start-worktree.mjs";

test("worktree startup reads the checked-in JSONC configuration", () => {
  const config = readWranglerConfig();

  assert.equal(config.name, "gomate");
  assert.equal(config.dev.port, 5432);
  assert.equal(config.version_metadata.binding, "CF_VERSION_METADATA");
});
