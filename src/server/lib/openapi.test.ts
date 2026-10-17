import { describe, expect, it } from "vitest";
import {
  createApiApp,
  createRoute,
  errorResponses,
  jsonResponse,
  legacyJsonBody,
  validationHook,
  z,
} from "./openapi";

function fixture() {
  const app = createApiApp();
  const route = createRoute({
    method: "post",
    path: "/example",
    middleware: [legacyJsonBody("Invalid JSON body")],
    request: {
      body: {
        required: true,
        content: {
          "application/json": { schema: z.object({ name: z.string().min(1) }) },
        },
      },
    },
    responses: {
      200: jsonResponse(z.object({ name: z.string() }), "Accepted"),
      ...errorResponses(400),
    },
  });
  app.openapi(
    route,
    (c) => c.json(c.req.valid("json"), 200),
    validationHook("Invalid input", "flatten"),
  );
  return app;
}

describe("OpenAPI request contract boundary", () => {
  it("retains ordinary JSON input compatibility when content type is omitted", async () => {
    const response = await fixture().request("/example", {
      method: "POST",
      body: JSON.stringify({ name: "Ada" }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Ada" });
  });
  it.each([
    "text/plain",
    "application/json",
    "application/json; charset=utf-8",
    "application/vnd.api+json",
  ])("accepts existing %s JSON bodies", async (contentType) => {
    const response = await fixture().request("/example", {
      method: "POST",
      headers: { "content-type": contentType },
      body: '{"name":"Ada"}',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ name: "Ada" });
  });
  it("normalizes malformed JSON separately from schema errors", async () => {
    const response = await fixture().request("/example", {
      method: "POST",
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" },
    });
    const invalid = await fixture().request("/example", {
      method: "POST",
      body: '{"name":4}',
    });
    expect(await invalid.json()).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input",
        details: {
          formErrors: [],
          fieldErrors: { name: ["Expected string, received number"] },
        },
      },
    });
  });
  it("preserves authorization denial before parsing or validating the body", async () => {
    const app = createApiApp();
    const route = createRoute({
      method: "post",
      path: "/private",
      middleware: [
        async (c: import("hono").Context) =>
          c.json(
            {
              success: false as const,
              error: {
                code: "UNAUTHORIZED",
                message: "Authentication required",
              },
            },
            401,
          ),
        legacyJsonBody("Invalid JSON body"),
      ],
      request: {
        body: {
          required: true,
          content: {
            "application/json": { schema: z.object({ name: z.string() }) },
          },
        },
      },
      responses: {
        200: jsonResponse(z.object({ name: z.string() }), "Accepted"),
        ...errorResponses(400, 401),
      },
    });
    app.openapi(route, (c) => c.json(c.req.valid("json"), 200));
    const response = await app.request("/private", {
      method: "POST",
      body: "{",
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Authentication required" },
    });
  });
  it("collects nested contracts and describes transformed query values as wire strings", () => {
    const nested = createApiApp();
    const route = createRoute({
      method: "get",
      path: "/{id}",
      request: {
        params: z.object({ id: z.string() }),
        query: z.object({
          tags: z.string().transform((value) => value.split(",")),
        }),
      },
      responses: {
        200: jsonResponse(z.object({ tags: z.array(z.string()) }), "Tags"),
      },
    });
    nested.openapi(route, (c) =>
      c.json({ tags: c.req.valid("query").tags }, 200),
    );
    const parent = createApiApp();
    const root = createApiApp();
    parent.route("/items", nested);
    root.route("/api", parent);
    const spec = root.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "Test", version: "1" },
    });
    expect(spec.paths?.["/api/items/{id}"]?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "tags",
          in: "query",
          schema: { type: "string" },
        }),
      ]),
    );
  });
});
