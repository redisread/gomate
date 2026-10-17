import { test } from "node:test";
import assert from "node:assert/strict";
import { planProductionMigrations } from "./production-migrations.mjs";
const files = [
  { name: "0000_init.sql", sha256: "a".repeat(64) },
  { name: "0001_contract.sql", sha256: "b".repeat(64) },
];
const manifest = {
  version: 1,
  migrations: [
    { ...files[0], phase: "historical", enabled: true },
    { ...files[1], phase: "contract", enabled: false },
  ],
};
test("holds destructive migrations while exposing only the enabled prefix", () => {
  assert.deepEqual(planProductionMigrations(files, manifest), {
    enabled: ["0000_init.sql"],
    held: ["0001_contract.sql"],
  });
});
test("fails closed on missing, reordered, changed or unclassified files", () => {
  for (const entries of [
    [],
    files.slice(1),
    [...files].reverse(),
    [{ ...files[0], sha256: "c".repeat(64) }, files[1]],
  ])
    assert.throws(() => planProductionMigrations(entries, manifest));
  assert.throws(() =>
    planProductionMigrations(files, {
      ...manifest,
      migrations: [
        { ...manifest.migrations[0], phase: "unknown" },
        manifest.migrations[1],
      ],
    }),
  );
});
test("requires reviewed release evidence before enabling contraction", () => {
  const enabled = structuredClone(manifest);
  enabled.migrations[1].enabled = true;
  assert.throws(() => planProductionMigrations(files, enabled), /evidence/);
  enabled.migrations[1].evidence = {
    compatibleWorkerVersion: "12345678-1234-1234-1234-123456789012",
    compatibleCommit: "a".repeat(40),
    observationStartedAt: "2026-10-17T00:00:00Z",
    observationEndedAt: "2026-10-18T00:00:00Z",
    verificationUrl: "https://github.com/example/repo/pull/1",
    rollbackClosure:
      "Old worker rollback is closed; restore database with compatible code.",
  };
  assert.equal(planProductionMigrations(files, enabled).enabled.length, 2);
});
test("rejects enabled migrations after a held migration", () => {
  const later = { name: "0002_expand.sql", sha256: "c".repeat(64) };
  assert.throws(
    () =>
      planProductionMigrations([...files, later], {
        ...manifest,
        migrations: [
          ...manifest.migrations,
          { ...later, phase: "expand", enabled: true },
        ],
      }),
    /prefix/,
  );
});

test("stages only the approved prefix with an explicit production binding", async () => {
  const { stageProductionMigrations } =
    await import("./production-migrations.mjs");
  const { fileURLToPath } = await import("node:url");
  const { readdir, readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const staged = await stageProductionMigrations(root, {
    name: "gomate",
    compatibility_date: "2026-06-18",
    env: {
      production: {
        d1_databases: [{ binding: "DB", database_name: "gomate-db-v3" }],
      },
    },
  });
  try {
    const names = await readdir(path.dirname(staged.configPath));
    assert.ok(names.includes("0010_minimal_team_meeting_point.sql"));
    assert.ok(names.includes("0011_minimal_product_contract.sql"));
    assert.deepEqual(staged.held, []);
    const config = JSON.parse(await readFile(staged.configPath, "utf8"));
    assert.equal(
      config.env.production.d1_databases[0].migrations_dir,
      path.dirname(staged.configPath),
    );
    assert.equal(
      config.env.production.d1_databases[0].database_name,
      "gomate-db-v3",
    );
  } finally {
    await staged.cleanup();
  }
  await assert.rejects(readFile(staged.configPath));
});
