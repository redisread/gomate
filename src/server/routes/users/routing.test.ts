import { beforeEach, expect, it, vi } from "vitest";
import { usersRoute } from "./index";

const mocks = vi.hoisted(() => ({ getActiveSession: vi.fn() }));
vi.mock("../../lib/active-session", () => ({
  getActiveSession: mocks.getActiveSession,
}));
beforeEach(() => mocks.getActiveSession.mockResolvedValue(null));

it.each([
  ["GET", "/me"],
  ["PATCH", "/me"],
  ["DELETE", "/me"],
  ["GET", "/me/created-teams?limit=invalid"],
  ["GET", "/me/joined-teams?cursor=invalid"],
])(
  "keeps %s %s private before validating input or reading D1",
  async (method, path) => {
    const response = await usersRoute.request(
      path,
      {
        method,
        ...(method === "GET" ? {} : { body: "{" }),
      },
      {},
    );
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
    if (method === "GET" && path === "/me") {
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("pragma")).toBe("no-cache");
    }
  },
);

it.each(["created-teams", "joined-teams"])(
  "preserves %s pagination validation and first-value precedence",
  async (path) => {
    mocks.getActiveSession.mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1" },
    });
    for (const [query, message] of [
      ["page=1&limit=nope", "page pagination is not supported; use cursor"],
      ["pageSize=1", "page pagination is not supported; use cursor"],
      ["limit=nope&limit=10", "limit must be an integer between 1 and 50"],
      ["limit=0", "limit must be an integer between 1 and 50"],
      ["limit=51", "limit must be an integer between 1 and 50"],
      ["cursor=invalid", "Invalid timeline cursor"],
    ]) {
      const response = await usersRoute.request(`/me/${path}?${query}`, {}, {});
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: { code: "BAD_REQUEST", message },
      });
    }
  },
);
