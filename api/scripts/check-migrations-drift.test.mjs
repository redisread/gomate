import { describe, expect, it } from "vitest";
import {
  compareMigrationState,
  hasBlockingMigrationDrift,
  parseMigrationDriftArgs,
} from "./migration-drift.mjs";

describe("compareMigrationState", () => {
  it("does not report missing legacy baseline migrations as drift", () => {
    const result = compareMigrationState({
      localNames: [
        "0000_bright_jackpot.sql",
        "0001_init.sql",
        "0018_add_actor_api_key_id.sql",
      ],
      legacyNames: ["0001_init.sql"],
      remoteNames: ["0000_bright_jackpot.sql", "0018_add_actor_api_key_id.sql"],
    });

    expect(result).toEqual({
      missing: [],
      unexpected: [],
      hasAppliedHistoryGap: false,
    });
  });

  it("reports a real local migration missing remotely", () => {
    const result = compareMigrationState({
      localNames: ["0000_bright_jackpot.sql", "0019_new_feature.sql"],
      legacyNames: [],
      remoteNames: ["0000_bright_jackpot.sql"],
    });

    expect(result.missing).toEqual(["0019_new_feature.sql"]);
    expect(result.unexpected).toEqual([]);
  });

  it("reports a remote migration that is not tracked locally", () => {
    const result = compareMigrationState({
      localNames: ["0000_bright_jackpot.sql"],
      legacyNames: [],
      remoteNames: ["0000_bright_jackpot.sql", "manual_hotfix.sql"],
    });

    expect(result.missing).toEqual([]);
    expect(result.unexpected).toEqual(["manual_hotfix.sql"]);
  });
});

describe("hasBlockingMigrationDrift", () => {
  it("allows local migrations that are waiting for the deploy apply step", () => {
    expect(
      hasBlockingMigrationDrift(
        { missing: ["0019_new_feature.sql"], unexpected: [] },
        { allowPending: true },
      ),
    ).toBe(false);
  });

  it("still blocks untracked remote migrations before apply", () => {
    expect(
      hasBlockingMigrationDrift(
        { missing: [], unexpected: ["manual_hotfix.sql"] },
        { allowPending: true },
      ),
    ).toBe(true);
  });

  it("blocks a missing migration inside the applied production history", () => {
    const state = compareMigrationState({
      localNames: [
        "0018_existing.sql",
        "0019_missing_middle.sql",
        "0020_already_applied.sql",
      ],
      legacyNames: [],
      remoteNames: ["0018_existing.sql", "0020_already_applied.sql"],
    });

    expect(hasBlockingMigrationDrift(state, { allowPending: true })).toBe(true);
  });

  it("accepts an existing fully-applied history recorded in a different order", () => {
    const state = compareMigrationState({
      localNames: ["0018_first.sql", "0019_second.sql", "0020_third.sql"],
      legacyNames: [],
      remoteNames: ["0018_first.sql", "0020_third.sql", "0019_second.sql"],
    });

    expect(hasBlockingMigrationDrift(state, { allowPending: true })).toBe(
      false,
    );
  });

  it("requires every local migration after apply", () => {
    expect(
      hasBlockingMigrationDrift(
        { missing: ["0019_new_feature.sql"], unexpected: [] },
        { allowPending: false },
      ),
    ).toBe(true);
  });
});

describe("parseMigrationDriftArgs", () => {
  it("accepts the production drift-check flags", () => {
    expect(parseMigrationDriftArgs(["--allow-pending", "--quiet"])).toEqual({
      allowPending: true,
      quiet: true,
    });
  });

  it("rejects removed environment flags instead of silently querying production", () => {
    expect(() =>
      parseMigrationDriftArgs(["--env", "removed-environment"]),
    ).toThrow("未知参数");
  });
});
