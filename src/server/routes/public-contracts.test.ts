import { describe, expect, it, vi } from "vitest";
import { createApiApp, createRoute, jsonResponse, z } from "../lib/openapi";
import { contactRoute } from "./contact";
import { feedbackRoute } from "./feedback";
import { regionsRoute } from "./regions";
import { tagsRoute } from "./tags";
import { favoritesRoute } from "./favorites";
import { usersRoute } from "./users";
import messagesRoute from "./messages";
import storiesRoute from "./stories";
vi.mock("../lib/active-session", () => ({
  getActiveSession: vi.fn(async () => null),
}));

describe("public route contracts", () => {
  it("registers form, region and tag operations without invoking business handlers", () => {
    const app = createApiApp();
    app
      .route("/contact", contactRoute)
      .route("/feedback", feedbackRoute)
      .route("/regions", regionsRoute)
      .route("/tags", tagsRoute);
    const document = app.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "API", version: "1" },
    });
    expect(document.paths?.["/contact"]?.post?.requestBody).toBeDefined();
    expect(document.paths?.["/regions"]?.get?.parameters).toHaveLength(4);
    expect(
      document.paths?.["/tags/{id}"]?.patch?.responses?.["200"],
    ).toBeDefined();
    expect(document.paths?.["/tags"]?.post).toMatchObject({
      "x-audience": "admin",
    });
  });
  it("preserves malformed form validation without invoking email delivery", async () => {
    const response = await contactRoute.request("/", {
      method: "POST",
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "输入无效" },
    });
  });
});

it.each([
  ["tags", tagsRoute, "POST", "/"],
  ["favorites", favoritesRoute, "POST", "/locations"],
  ["users", usersRoute, "PATCH", "/me"],
  ["messages", messagesRoute, "POST", "/"],
  ["stories", storiesRoute, "POST", "/"],
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

it("documents every ordinary module without accessing a database", () => {
  const app = createApiApp();
  app
    .route("/favorites", favoritesRoute)
    .route("/users", usersRoute)
    .route("/messages", messagesRoute)
    .route("/stories", storiesRoute);
  const document = app.getOpenAPI31Document({
    openapi: "3.1.0",
    info: { title: "API", version: "1" },
  });
  expect(
    Object.values(document.paths ?? {}).flatMap((path) =>
      Object.keys(path ?? {}).filter((key) =>
        ["get", "post", "patch", "put", "delete"].includes(key),
      ),
    ),
  ).toHaveLength(28);
  expect(document.paths?.["/stories/{id}"]?.put?.requestBody).toBeDefined();
});

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
