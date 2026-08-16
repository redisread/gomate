import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "promote-admin.mjs");

test("refuses every production or pre-confirmed admin promotion", () => {
  for (const forbidden of [["--env", "production"], ["--yes"]]) {
    const result = spawnSync(
      process.execPath,
      [SCRIPT, "--email", "admin@example.com", ...forbidden],
      { cwd: ROOT, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /仅允许本地 D1/u);
  }
});

test("help is read-only and succeeds without a D1 process", () => {
  const result = spawnSync(process.execPath, [SCRIPT, "--help"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--email/u);
});
