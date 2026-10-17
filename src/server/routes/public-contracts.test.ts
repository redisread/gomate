import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiApp, createRoute, jsonResponse, z } from "../lib/openapi";
import { feedbackRoute } from "./feedback";
import { regionsRoute } from "./regions";
import { tagsRoute } from "./tags";
import { usersRoute } from "./users";
const mocks = vi.hoisted(() => ({ getActiveSession: vi.fn() }));
vi.mock("../lib/active-session", () => ({
  getActiveSession: mocks.getActiveSession,
}));
beforeEach(() => {
  mocks.getActiveSession.mockResolvedValue(null);
});

describe("public route contracts", () => {
  it("registers form, region and tag operations without invoking business handlers", () => {
    const app = createApiApp();
    app
      .route("/feedback", feedbackRoute)
      .route("/regions", regionsRoute)
      .route("/tags", tagsRoute);
    const document = app.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "API", version: "1" },
    });
    expect(document.paths?.["/feedback"]?.post?.requestBody).toBeDefined();
    expect(document.paths?.["/regions"]?.get?.parameters).toHaveLength(4);
    expect(
      document.paths?.["/tags/{id}"]?.patch?.responses?.["200"],
    ).toBeDefined();
    expect(document.paths?.["/tags"]?.post).toMatchObject({
      "x-audience": "admin",
    });
  });
  it("preserves malformed form validation without invoking email delivery", async () => {
    const response = await feedbackRoute.request(
      "/",
      {
        method: "POST",
        body: "{",
      },
      { FEEDBACK_RATE_LIMITER: { limit: async () => ({ success: true }) } },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "输入无效" },
    });
  });
});

it.each([
  ["tags", tagsRoute, "POST", "/"],
  ["users", usersRoute, "PATCH", "/me"],
] as const)(
  "%s keeps authentication ahead of malformed body",
  async (_name, app, method, path) => {
    const response = await app.request(path, { method, body: "{" }, {});
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  },
);

it("keeps concrete success response fields and status codes checked by TypeScript", () => {
  const app = createApiApp();
  const route = createRoute({
    method: "get",
    path: "/typed",
    responses: {
      200: jsonResponse(
        z.object({ success: z.literal(true), count: z.number() }),
        "Count",
      ),
    },
  });
  app.openapi(route, (c) =>
    // @ts-expect-error A string count cannot satisfy the public numeric contract.
    c.json({ success: true as const, count: "wrong" }, 200),
  );
  const statusRoute = createRoute({
    method: "get",
    path: "/typed-status",
    responses: {
      200: jsonResponse(z.object({ success: z.literal(true) }), "Success"),
    },
  });
  // @ts-expect-error A handler cannot return an undeclared success status.
  app.openapi(statusRoute, (c) => c.json({ success: true as const }, 201));
  expect(app.routes).toHaveLength(2);
});

it("preserves private account response headers on an anonymous request", async () => {
  const response = await usersRoute.request("/me", {}, {});
  expect(response.status).toBe(401);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("pragma")).toBe("no-cache");
});

it.each([
  [
    "timeline",
    usersRoute,
    "/me/created-teams?limit=nope&limit=10",
    "limit must be an integer between 1 and 50",
  ],
  [
    "timeline page precedence",
    usersRoute,
    "/me/created-teams?page=1&page=2&limit=nope",
    "page pagination is not supported; use cursor",
  ],
] as const)(
  "preserves first-value query and unsupported parameter behavior: %s",
  async (_name, app, path, message) => {
    mocks.getActiveSession.mockResolvedValue({
      user: { id: "user-1" },
      session: { id: "session-1" },
    });
    const response = await app.request(path, {}, {});
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "BAD_REQUEST", message },
    });
  },
);
