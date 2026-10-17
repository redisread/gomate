import { createHash } from "node:crypto";
import {
  mkdtemp,
  readdir,
  readFile,
  writeFile,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

function assertReleaseEvidence(evidence) {
  if (
    !evidence ||
    !/^[a-f0-9-]{36}$/u.test(evidence.compatibleWorkerVersion ?? "") ||
    !/^[a-f0-9]{40}$/u.test(evidence.compatibleCommit ?? "") ||
    !/^https:\/\//u.test(evidence.verificationUrl ?? "") ||
    typeof evidence.rollbackClosure !== "string" ||
    !evidence.rollbackClosure.trim() ||
    !Number.isFinite(Date.parse(evidence.observationStartedAt)) ||
    !Number.isFinite(Date.parse(evidence.observationEndedAt)) ||
    Date.parse(evidence.observationEndedAt) <=
      Date.parse(evidence.observationStartedAt)
  ) {
    throw new Error(
      "Contract migration requires reviewed compatible Worker, observation and rollback closure evidence",
    );
  }
}

/** No environment overrides: authorization is an auditable, protected Git change. */
export function planProductionMigrations(files, manifest) {
  if (
    manifest?.version !== 1 ||
    !Array.isArray(manifest.migrations) ||
    manifest.migrations.length !== files.length ||
    files.length === 0
  ) {
    throw new Error(
      "Every migration must be classified in the production manifest",
    );
  }
  const enabled = [],
    held = [];
  for (const [index, file] of files.entries()) {
    const entry = manifest.migrations[index];
    if (
      !file.name.startsWith(`${String(index).padStart(4, "0")}_`) ||
      !/^\d{4}_[\w-]+\.sql$/u.test(file.name) ||
      entry.name !== file.name ||
      entry.sha256 !== file.sha256 ||
      !/^[a-f0-9]{64}$/u.test(file.sha256)
    ) {
      throw new Error(
        "Migration order, name or digest differs from the reviewed manifest",
      );
    }
    if (
      !["historical", "expand", "contract"].includes(entry.phase) ||
      typeof entry.enabled !== "boolean"
    )
      throw new Error("Unclassified migration phase");
    if (entry.enabled) {
      if (held.length)
        throw new Error("Enabled migrations must form a contiguous prefix");
      if (entry.phase === "contract") assertReleaseEvidence(entry.evidence);
      enabled.push(file.name);
    } else held.push(file.name);
  }
  return { enabled, held };
}

export async function readProductionMigrationPlan(root) {
  const dir = path.join(root, "migrations");
  const names = (await readdir(dir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      sha256: createHash("sha256")
        .update(await readFile(path.join(dir, name)))
        .digest("hex"),
    })),
  );
  const manifest = JSON.parse(
    await readFile(path.join(dir, "production-phases.json"), "utf8"),
  );
  return planProductionMigrations(files, manifest);
}

/** Wrangler sees only the approved prefix; staging files are always disposed. */
export async function stageProductionMigrations(root, config) {
  const plan = await readProductionMigrationPlan(root);
  const db = config.env?.production?.d1_databases?.find(
    (db) => db.binding === "DB",
  );
  if (!db?.database_name) throw new Error("Missing production DB binding");
  const directory = await mkdtemp(
    path.join(tmpdir(), "gomate-production-migrations-"),
  );
  try {
    for (const name of plan.enabled)
      await copyFile(
        path.join(root, "migrations", name),
        path.join(directory, name),
      );
    const configPath = path.join(directory, "wrangler.json");
    await writeFile(
      configPath,
      JSON.stringify(
        {
          name: config.name,
          compatibility_date: config.compatibility_date,
          env: {
            production: {
              d1_databases: [{ ...db, migrations_dir: directory }],
            },
          },
        },
        null,
        2,
      ),
    );
    return {
      ...plan,
      configPath,
      cleanup: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
