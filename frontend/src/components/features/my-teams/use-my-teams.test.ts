import { describe, expect, it } from "vitest";
import { buildTimelinePath, mergeUniqueById } from "./use-my-teams";

describe("my teams timeline pagination", () => {
  it("builds a cursor-only request without page aliases", () => {
    const path = buildTimelinePath("/users/me/created-teams", "opaque+/=");
    const url = new URL(path, "https://gomate.live");

    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("cursor")).toBe("opaque+/=");
    expect(url.searchParams.has("page")).toBe(false);
    expect(url.searchParams.has("pageSize")).toBe(false);
  });

  it("omits the cursor on the first page", () => {
    expect(buildTimelinePath("/users/me/join-requests", null)).toBe(
      "/users/me/join-requests?limit=10",
    );
  });

  it("deduplicates an item repeated at a page boundary", () => {
    expect(mergeUniqueById([{ id: "a" }, { id: "b" }], [{ id: "b" }, { id: "c" }])).toEqual([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ]);
  });
});
