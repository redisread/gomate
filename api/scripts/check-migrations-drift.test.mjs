import { describe, expect, it } from "vitest";
import { compareMigrationState } from "./migration-drift.mjs";

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
