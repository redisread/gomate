import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { apiRoot, migrationsDir } from "./database-v2-test-helpers.mjs";

const workspaceRoot = join(apiRoot, "..");
const workerRoot = join(workspaceRoot, "frontend");
const wranglerPath = join(apiRoot, "node_modules", ".bin", "wrangler");
const testRoot = mkdtempSync(join(tmpdir(), "gomate-d1-workerd-"));
const approvalWorkerPath = join(
  apiRoot,
  "scripts",
  "fixtures",
  "team-approval-workerd-worker.mjs",
);

function runWrangler(args, instance, options = {}) {
  const persistTo = join(testRoot, instance, "state");
  mkdirSync(persistTo, { recursive: true });
  return execFileSync(
    wranglerPath,
    [
      ...args,
      "--local",
      "--persist-to",
      persistTo,
      "--config",
      options.config ?? "wrangler.jsonc",
    ],
    {
      cwd: options.cwd ?? workerRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "1",
        WRANGLER_LOG_PATH: join(testRoot, instance, "wrangler.log"),
      },
      timeout: 30_000,
    },
  );
}

async function reservePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Unable to reserve a local workerd test port");
  }
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return address.port;
}

async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  await Promise.race([exited, delay(5_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    const forcedExit = once(child, "exit");
    child.kill("SIGKILL");
    await forcedExit;
  }
}

async function startApprovalWorker(instance) {
  const instanceRoot = join(testRoot, instance);
  const persistTo = join(instanceRoot, "state");
  const configPath = join(instanceRoot, "wrangler.jsonc");
  const logPath = join(instanceRoot, "wrangler-dev.log");
  const port = await reservePort();
  mkdirSync(instanceRoot, { recursive: true });
  writeFileSync(
    configPath,
    JSON.stringify({
      name: "gomate-team-approval-workerd-test",
      main: approvalWorkerPath,
      compatibility_date: "2026-06-18",
      compatibility_flags: ["nodejs_compat"],
      dev: { ip: "127.0.0.1", port },
      d1_databases: [
        {
          binding: "DB",
          database_name: "gomate-db-v2",
          migrations_dir: migrationsDir,
        },
      ],
    }),
  );

  runWrangler(["d1", "migrations", "apply", "DB"], instance, {
    config: configPath,
    cwd: instanceRoot,
  });

  const child = spawn(
    wranglerPath,
    ["dev", "--local", "--persist-to", persistTo, "--config", configPath],
    {
      cwd: instanceRoot,
      env: {
        ...process.env,
        CI: "1",
        NO_COLOR: "1",
        WRANGLER_LOG_PATH: logPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Wrangler dev exited before readiness:\n${output}`);
    }
    try {
      const health = await globalThis.fetch(`${url}/health`);
      if (health.ok) break;
    } catch {
      // Wrangler is still starting.
    }
    await delay(100);
  }

  try {
    const health = await globalThis.fetch(`${url}/health`);
    if (!health.ok) throw new Error(`Health returned ${health.status}`);
    const seeded = await globalThis.fetch(`${url}/seed`, { method: "POST" });
    if (!seeded.ok) {
      throw new Error(`Approval fixture seed failed: ${await seeded.text()}`);
    }
  } catch (error) {
    await stopProcess(child);
    throw new Error(
      `Wrangler approval worker did not become ready: ${String(error)}\n${output}`,
    );
  }

  return {
    url,
    stop: () => stopProcess(child),
  };
}

function approve(url, requestId, now) {
  return globalThis.fetch(`${url}/approve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestId, now }),
  });
}

function triggerFailure(url, kind) {
  return globalThis.fetch(`${url}/trigger-failure/${kind}`, {
    method: "POST",
  });
}

function revokeSessions(url, kind) {
  return globalThis.fetch(`${url}/session-revocation/${kind}`, {
    method: "POST",
  });
}

function updateStoryTags(url, storyId, shouldUpdate, tags) {
  return globalThis.fetch(`${url}/story-tags`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storyId, shouldUpdate, tags }),
  });
}

function updateTeamTags(url, teamId, tagIds, disableLocation = false) {
  return globalThis.fetch(`${url}/team-tags`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ teamId, tagIds, disableLocation }),
  });
}

async function issuePasswordReset(
  url,
  now,
  email = "reset-user@example.com",
) {
  const result = await globalThis.fetch(`${url}/password-reset/issue`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, now }),
  });
  if (!result.ok) throw new Error(`Reset issue returned ${result.status}`);
  return (await result.json()).token;
}

function suspendPasswordReset(url, token, password, now) {
  return globalThis.fetch(`${url}/password-reset/suspend`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password, now }),
  });
}

function commitPasswordReset(url, token, password, now) {
  return globalThis.fetch(`${url}/password-reset/commit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, password, now }),
  });
}

async function readPasswordResetState(url, password) {
  const result = await globalThis.fetch(
    `${url}/password-reset/state?password=${encodeURIComponent(password)}`,
  );
  if (!result.ok) throw new Error(`Reset state returned ${result.status}`);
  return result.json();
}

async function readStoryTagState(url, storyId) {
  const response = await globalThis.fetch(
    `${url}/story-tag-state?storyId=${encodeURIComponent(storyId)}`,
  );
  if (!response.ok) {
    throw new Error(`Story tag state query returned ${response.status}`);
  }
  return response.json();
}

async function readTeamTagState(url, teamId) {
  const response = await globalThis.fetch(
    `${url}/team-tag-state?teamId=${encodeURIComponent(teamId)}`,
  );
  if (!response.ok) {
    throw new Error(`Team tag state query returned ${response.status}`);
  }
  return response.json();
}

async function readTeamState(url, teamId) {
  const response = await globalThis.fetch(
    `${url}/state?teamId=${encodeURIComponent(teamId)}`,
  );
  if (!response.ok) throw new Error(`State query returned ${response.status}`);
  return response.json();
}

function readIntegrity(instance) {
  const output = runWrangler(
    [
      "d1",
      "execute",
      "DB",
      "--command",
      `SELECT
      (SELECT COUNT(*) FROM sqlite_master
       WHERE type = 'table'
         AND name NOT LIKE 'sqlite_%'
         AND name NOT IN ('_cf_METADATA', 'd1_migrations')) AS business_tables,
      (SELECT COUNT(*) FROM sqlite_master WHERE type = 'trigger') AS triggers,
      (SELECT COUNT(*) FROM d1_migrations WHERE name = '0000_init.sql') AS ledger_entries,
      (SELECT COUNT(*) FROM pragma_foreign_key_check) AS foreign_key_violations`,
    ],
    instance,
  );
  const match = output.match(/\[\s*\{\s*"results"[\s\S]*\]\s*$/u);
  if (!match)
    throw new Error(`Unable to parse Wrangler JSON output:\n${output}`);
  return JSON.parse(match[0])[0].results[0];
}

afterAll(() => {
  rmSync(testRoot, { recursive: true, force: true });
});

describe("V2 baseline in real local workerd/D1", () => {
  it("applies in two isolated databases and is ledger-idempotent", () => {
    const firstApply = runWrangler(
      ["d1", "migrations", "apply", "DB"],
      "first",
    );
    const firstReplay = runWrangler(
      ["d1", "migrations", "apply", "DB"],
      "first",
    );
    const secondApply = runWrangler(
      ["d1", "migrations", "apply", "DB"],
      "second",
    );

    expect(firstApply).toContain("0000_init.sql");
    expect(firstReplay).toContain("No migrations to apply");
    expect(secondApply).toContain("0000_init.sql");
    expect(readIntegrity("first")).toEqual({
      business_tables: 19,
      triggers: 8,
      ledger_entries: 1,
      foreign_key_violations: 0,
    });
    expect(readIntegrity("second")).toEqual({
      business_tables: 19,
      triggers: 8,
      ledger_entries: 1,
      foreign_key_violations: 0,
    });
  }, 60_000);
});

describe("Team approval through a real Wrangler workerd/D1 binding", () => {
  let worker;

  beforeAll(async () => {
    worker = await startApprovalWorker("team-approval");
  }, 60_000);

  afterAll(async () => {
    await worker?.stop();
  });

  it("approves a pending request by atomically activating its member", async () => {
    const response = await approve(
      worker.url,
      "request-success",
      2_000_000_000_001,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ changes: [1, 1] });

    expect(await readTeamState(worker.url, "team-success")).toEqual({
      members: [{ userId: "success-user", leftAt: null }],
      requests: [
        { id: "request-success", userId: "success-user", status: "approved" },
      ],
    });
  });

  it("uses the same approval command builder as the production route", () => {
    const fixture = readFileSync(approvalWorkerPath, "utf8");
    const route = readFileSync(
      join(apiRoot, "src", "routes", "teams", "membership.ts"),
      "utf8",
    );
    expect(fixture).toMatch(/createTeamApprovalBatch/u);
    expect(route).toMatch(/createTeamApprovalBatch/u);
    expect(fixture).not.toMatch(/ON CONFLICT\(team_id, user_id\) DO UPDATE/u);
    expect(route).not.toMatch(/ON CONFLICT\(team_id, user_id\) DO UPDATE/u);

    const storyRoute = readFileSync(
      join(apiRoot, "src", "routes", "stories.ts"),
      "utf8",
    );
    expect(fixture).toMatch(/createStoryTagUpdateBatch/u);
    expect(storyRoute).toMatch(/createStoryTagUpdateBatch/u);

    const teamRoute = readFileSync(
      join(apiRoot, "src", "routes", "teams", "mutations.ts"),
      "utf8",
    );
    expect(fixture).toMatch(/createTeamTagUpdateBatch/u);
    expect(teamRoute).toMatch(/createTeamTagUpdateBatch/u);

    const authRoute = readFileSync(
      join(apiRoot, "src", "routes", "auth.ts"),
      "utf8",
    );
    expect(fixture).toMatch(/resetPasswordWithChallenge/u);
    expect(authRoute).toMatch(/resetPasswordWithChallenge/u);
  });

  it("keeps only the latest password-reset challenge and consumes it atomically in real D1", async () => {
    const first = await issuePasswordReset(worker.url, 2_000_000_010_000);
    const second = await issuePasswordReset(worker.url, 2_000_000_010_001);

    expect((await commitPasswordReset(
      worker.url,
      first,
      "stale-link-password",
      2_000_000_010_002,
    )).status).toBe(400);
    expect((await commitPasswordReset(
      worker.url,
      second,
      "latest-link-password",
      2_000_000_010_003,
    )).status).toBe(200);
    expect(await readPasswordResetState(worker.url, "latest-link-password"))
      .toEqual({ passwordMatches: true, sessions: 0, challenges: 0 });
    expect((await commitPasswordReset(
      worker.url,
      second,
      "replayed-password",
      2_000_000_010_004,
    )).status).toBe(400);
  });

  it("allows only one real D1 consumer for the same password-reset token", async () => {
    const token = await issuePasswordReset(worker.url, 2_000_000_020_000);
    const responses = await Promise.all([
      commitPasswordReset(
        worker.url,
        token,
        "concurrent-password-a",
        2_000_000_020_001,
      ),
      commitPasswordReset(
        worker.url,
        token,
        "concurrent-password-b",
        2_000_000_020_001,
      ),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 400]);
    const states = await Promise.all([
      readPasswordResetState(worker.url, "concurrent-password-a"),
      readPasswordResetState(worker.url, "concurrent-password-b"),
    ]);
    expect(states.filter(({ passwordMatches }) => passwordMatches)).toHaveLength(1);
    expect(states[0]).toMatchObject({ sessions: 0, challenges: 0 });
    expect(states[1]).toMatchObject({ sessions: 0, challenges: 0 });
  });

  it("revokes a reset challenge on suspension and rejects it after reactivation in real D1", async () => {
    const token = await issuePasswordReset(
      worker.url,
      2_000_000_030_000,
      "reset-suspension@example.com",
    );
    const response = await suspendPasswordReset(
      worker.url,
      token,
      "suspension-race-password",
      2_000_000_030_001,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      before: 1,
      revoked: 0,
      resetAccepted: false,
      passwordMatches: false,
      sessions: 0,
      challenges: 0,
    });
  });

  it("changes story tags only when the conditional UPDATE succeeds in real D1", async () => {
    const success = await updateStoryTags(
      worker.url,
      "story-tag-success",
      true,
      ["成功新标签"],
    );
    expect(success.status).toBe(200);
    expect(
      await readStoryTagState(worker.url, "story-tag-success"),
    ).toMatchObject({
      story: { title: "updated-story-tag-success" },
      linkedTags: ["成功新标签"],
      writeGates: [],
    });

    const beforeConflict = await readStoryTagState(
      worker.url,
      "story-tag-conflict",
    );
    const conflict = await updateStoryTags(
      worker.url,
      "story-tag-conflict",
      false,
      ["失败新标签"],
    );
    expect(conflict.status).toBe(409);
    const afterConflict = await readStoryTagState(
      worker.url,
      "story-tag-conflict",
    );
    expect(afterConflict).toEqual(beforeConflict);
    expect(afterConflict).toMatchObject({
      story: { title: "story-tag-conflict" },
      linkedTags: ["竞态旧标签"],
      writeGates: [],
    });
    expect(afterConflict.dictionary).not.toContain("失败新标签");
  });

  it("replaces team tags after a successful conditional UPDATE in real D1", async () => {
    const before = await readTeamTagState(worker.url, "team-tag-success");
    const response = await updateTeamTags(worker.url, "team-tag-success", [
      "team-tag-success-new",
    ]);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ changes: 1 });
    const after = await readTeamTagState(worker.url, "team-tag-success");
    expect(after).toMatchObject({
      team: { title: "updated-team-tag-success" },
      linkedTags: ["team-tag-success-new"],
      writeGates: [],
    });
    expect(after.dictionary).toEqual(before.dictionary);
  });

  it("preserves team and tag state when its conditional UPDATE writes zero rows in real D1", async () => {
    const before = await readTeamTagState(worker.url, "team-tag-conflict");
    const response = await updateTeamTags(
      worker.url,
      "team-tag-conflict",
      ["team-tag-conflict-new"],
      true,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ changes: 0 });
    expect(await readTeamTagState(worker.url, "team-tag-conflict")).toEqual(
      before,
    );
  });

  it.each([
    ["story-like", "STORY_LIKE_COUNT_FAILED"],
    ["message-summary", "MESSAGE_SUMMARY_FAILED"],
  ])(
    "maps a real D1 %s trigger failure to a stable non-leaking envelope",
    async (kind, code) => {
      const response = await triggerFailure(worker.url, kind);
      const body = await response.json();

      expect(response.status).toBe(409);
      expect(body).toMatchObject({ success: false, error: { code } });
      expect(JSON.stringify(body)).not.toMatch(
        /D1_ERROR|SQL:|INSERT INTO|story_likes|messages/iu,
      );
    },
  );

  it.each(["status", "deleted-at"])(
    "revokes sessions on the real D1 %s transition and never restores them",
    async (kind) => {
      const response = await revokeSessions(worker.url, kind);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        before: 2,
        revoked: 0,
        insertBlocked: true,
        restored: 0,
      });
    },
  );

  it("rolls the whole batch back when capacity is exhausted", async () => {
    const response = await approve(
      worker.url,
      "request-full",
      2_000_000_000_002,
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("TEAM_CAPACITY_EXCEEDED");

    expect(await readTeamState(worker.url, "team-full")).toEqual({
      members: [{ userId: "full-holder", leftAt: null }],
      requests: [
        { id: "request-full", userId: "full-candidate", status: "pending" },
      ],
    });
  });

  it("makes a retry a no-op without duplicating or re-deciding state", async () => {
    const response = await approve(
      worker.url,
      "request-success",
      2_000_000_000_003,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ changes: [0, 0] });

    expect(await readTeamState(worker.url, "team-success")).toEqual({
      members: [{ userId: "success-user", leftAt: null }],
      requests: [
        { id: "request-success", userId: "success-user", status: "approved" },
      ],
    });
  });

  it("serializes two requests racing for the last seat", async () => {
    const responses = await Promise.all([
      approve(worker.url, "request-race-a", 2_000_000_000_004),
      approve(worker.url, "request-race-b", 2_000_000_000_005),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);

    const state = await readTeamState(worker.url, "team-race");
    expect(state.members).toHaveLength(1);
    const approved = state.requests.filter(
      ({ status }) => status === "approved",
    );
    expect(approved).toHaveLength(1);
    expect(
      state.requests.filter(({ status }) => status === "pending"),
    ).toHaveLength(1);
    expect(approved[0].userId).toBe(state.members[0].userId);
  });
});
