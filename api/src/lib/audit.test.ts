import { describe, expect, it } from "vitest";
import { hashApiKeyForLookup } from "./audit";

describe("hashApiKeyForLookup", () => {
  it("matches Better Auth's SHA-256 base64url format", async () => {
    expect(await hashApiKeyForLookup("gm_live_test-key"))
      .toBe("gkpIVHM93AsWO0GmFbOx919vRA5239rIL9asNmMmNeA");
  });

  it("produces distinct lookup values for different keys", async () => {
    const [first, second] = await Promise.all([
      hashApiKeyForLookup("gm_live_first"),
      hashApiKeyForLookup("gm_live_second"),
    ]);
    expect(first).not.toBe(second);
  });
});
