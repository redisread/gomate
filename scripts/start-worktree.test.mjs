import assert from "node:assert/strict";
import test from "node:test";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { readWranglerConfig } from "./start-worktree.mjs";

test("worktree startup reads the checked-in JSONC configuration", () => {
  const config = readWranglerConfig();

  assert.equal(config.name, "gomate");
  assert.equal(config.dev.port, 5432);
  assert.equal(config.version_metadata.binding, "CF_VERSION_METADATA");
});

test("worktree owns the foreground server and keeps its config until shutdown", { timeout: 10_000 }, async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "gomate-dev-lifecycle-"));
  const runner = path.join(directory, "pnpm.mjs");
  // Model Astro's agent auto-backgrounding: the CLI returns unless opted out.
  await writeFile(runner, `
    if (!process.argv.includes('--ignore-lock')) process.exit(0);
    console.log('SERVER_READY');
    setInterval(() => {}, 1000);
  `);
  const child = spawn(process.execPath, ["scripts/start-worktree.mjs"], {
    env: { ...process.env, npm_execpath: runner, GOMATE_WEB_PORT: "5536" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const closed = once(child, "close");
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGTERM");
    await closed;
    await rm(directory, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
      if (output.includes("SERVER_READY")) resolve();
    });
    child.once("error", reject);
    child.once("close", () => reject(new Error("server exited before becoming ready")));
  });
  const configPath = `.wrangler.dev.${child.pid}.5536.jsonc`;
  const config = JSON.parse(await readFile(configPath, "utf8"));
  assert.equal(config.vars.APP_URL, "http://localhost:5536");
  assert.equal(config.dev.port, 5536);
  child.kill("SIGTERM");
  await closed;
  await assert.rejects(access(configPath), { code: "ENOENT" });
});
