import { describe, expect, it, vi } from "vitest";
const bindings = vi.hoisted(() => ({ IOS_APP_ID: "" }));
vi.mock("cloudflare:workers", () => ({ env: bindings }));
const { GET } = await import("../../pages/.well-known/apple-app-site-association");

describe("native recovery Universal Links", () => {
  it("publishes only configured app identities and recovery paths", async () => {
    bindings.IOS_APP_ID = "TESTTEAM00.live.gomate.app";
    const response = await GET({} as never);
    expect(response.headers.get("content-type")).toBe("application/json");
    const data = await response.json() as { applinks: { details: { appIDs: string[]; components: Record<string, string>[] }[] } };
    expect(data.applinks.details[0].appIDs).toEqual([bindings.IOS_APP_ID]);
    expect(data.applinks.details[0].components).toHaveLength(6);
    expect(data.applinks.details[0].components).toContainEqual({ "/": "/reset-password" });
    expect(data.applinks.details[0].components).not.toContainEqual({ "/": "*" });
  });
  it("returns an empty association for absent or malformed identities", async () => {
    for (const identity of ["", "https://attacker.example", "team.*"]) {
      bindings.IOS_APP_ID = identity;
      expect(await (await GET({} as never)).json()).toEqual({ applinks: { details: [] } });
    }
  });
});
