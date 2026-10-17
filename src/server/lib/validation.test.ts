import { describe, expect, it } from "vitest";

import { utcDateTimeSchema } from "@/contracts/input-formats";
import { updateTeamSchema } from "../routes/teams/mutations";
import {
  createLocationInputSchema,
  updateLocationInputSchema,
} from "../routes/locations/utils";
import { APIErrors } from "./api-errors";
import {
  createApiApp,
  createRoute,
  z,
  jsonResponse,
  errorResponses,
  legacyJsonBody,
  validationHook,
} from "./openapi";

describe("contract validation", () => {
  it("returns the existing validation error envelope with issue details", async () => {
    const app = createApiApp();
    app.openapi(
      createRoute({
        method: "post",
        path: "/",
        middleware: [legacyJsonBody("Invalid input")],
        request: {
          body: {
            required: true,
            content: {
              "application/json": {
                schema: z.object({ name: z.string().min(1) }),
              },
            },
          },
        },
        responses: {
          200: jsonResponse(z.object({ success: z.literal(true) }), "Success"),
          ...errorResponses(400),
        },
      }),
      (c) => c.json({ success: true as const }, 200),
      validationHook("Invalid input", "issues"),
    );

    const response = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ...APIErrors.validationError("Invalid input"),
      error: {
        details: [
          expect.objectContaining({ path: ["name"], code: "too_small" }),
        ],
      },
    });
  });

  it("preserves the existing flattened validation detail shape", async () => {
    const app = createApiApp();
    app.openapi(
      createRoute({
        method: "get",
        path: "/",
        request: { query: z.object({ page: z.string().regex(/^\\d+$/) }) },
        responses: {
          200: jsonResponse(z.object({ success: z.literal(true) }), "Success"),
          ...errorResponses(400),
        },
      }),
      (c) => c.json({ success: true as const }, 200),
      validationHook("Invalid query", "flatten"),
    );

    const response = await app.request("/?page=nope");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid query",
        details: {
          formErrors: [],
          fieldErrors: { page: [expect.any(String)] },
        },
      },
    });
  });

  it("keeps parsing JSON bodies when clients omit content-type", async () => {
    const app = createApiApp();
    app.openapi(
      createRoute({
        method: "post",
        path: "/",
        middleware: [legacyJsonBody("Invalid input")],
        request: {
          body: {
            required: true,
            content: {
              "application/json": { schema: z.object({ name: z.string() }) },
            },
          },
        },
        responses: {
          200: jsonResponse(
            z.object({ success: z.literal(true), name: z.string() }),
            "Success",
          ),
          ...errorResponses(400),
        },
      }),
      async (c) => {
        const result = c.req.valid("json");
        return c.json({ success: true as const, name: result.name }, 200);
      },
      validationHook("Invalid input", "issues"),
    );

    const response = await app.request("/", {
      method: "POST",
      body: JSON.stringify({ name: "Victor" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true as const,
      name: "Victor",
    });
  });
});

// These HTTP snapshots were captured before the Zod 4 upgrade. They pin the
// public error contract, including details used by existing clients.
describe("validation HTTP compatibility", () => {
  const schema = z
    .object({
      name: z.string().min(1),
      count: z.number().int().min(1),
      status: z.enum(["open", "closed"]),
      email: z.string().email(),
      code: z.string().regex(/^a$/),
    })
    .strict();
  it.each([
    {},
    { name: "", count: 1.5, status: "bad", email: "bad", code: "b", extra: 1 },
    { name: null, count: 0, status: 7, email: 1, code: false },
  ])("preserves issue fields and messages for %j", async (body) => {
    const app = createApiApp();
    app.openapi(
      createRoute({
        method: "post",
        path: "/",
        middleware: [legacyJsonBody("Invalid input")],
        request: {
          body: {
            required: true,
            content: { "application/json": { schema: schema } },
          },
        },
        responses: {
          200: jsonResponse(schema, "Success"),
          ...errorResponses(400),
        },
      }),
      async (c) => {
        const input = c.req.valid("json");
        return c.json(input, 200);
      },
      validationHook("Invalid input", "issues"),
    );
    const response = await app.request("/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchSnapshot();
  });
});

it("does not reset omitted location fields in a partial HTTP update", async () => {
  const app = createApiApp();
  app.openapi(
    createRoute({
      method: "put",
      path: "/",
      middleware: [legacyJsonBody("Invalid input")],
      request: {
        body: {
          required: true,
          content: {
            "application/json": { schema: updateLocationInputSchema },
          },
        },
      },
      responses: {
        200: jsonResponse(updateLocationInputSchema, "Success"),
        ...errorResponses(400),
      },
    }),
    async (c) => {
      const value = c.req.valid("json");
      return c.json(value, 200);
    },
    validationHook("Invalid input", "issues"),
  );
  const response = await app.request("/", {
    method: "PUT",
    body: JSON.stringify({ id: "loc-1", name: " New name " }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "loc-1", name: "New name" });
});

it("accepts the existing compact timezone offset on team updates", async () => {
  const app = createApiApp();
  app.openapi(
    createRoute({
      method: "put",
      path: "/",
      middleware: [legacyJsonBody("Invalid input")],
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: updateTeamSchema } },
        },
      },
      responses: {
        200: jsonResponse(updateTeamSchema, "Success"),
        ...errorResponses(400),
      },
    }),
    async (c) => {
      const value = c.req.valid("json");
      return c.json(value, 200);
    },
    validationHook("Invalid input", "issues"),
  );
  const body = { startAt: "2030-01-01T10:00:00+0800" };
  const response = await app.request("/", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(body);
});

it("preserves nested union, literal and authored error details", async () => {
  const app = createApiApp();
  const schema = z.object({
    nested: z.object({ value: z.union([z.string(), z.null()]) }),
    confirmation: z.literal("DELETE"),
    values: z.array(z.string()).max(1),
    title: z.string().min(2, "标题太短"),
  });
  app.openapi(
    createRoute({
      method: "post",
      path: "/",
      middleware: [legacyJsonBody("Invalid input")],
      request: {
        body: {
          required: true,
          content: { "application/json": { schema: schema } },
        },
      },
      responses: {
        200: jsonResponse(schema, "Success"),
        ...errorResponses(400),
      },
    }),
    async (c) => {
      const value = c.req.valid("json");
      return c.json(value, 200);
    },
    validationHook("Invalid input", "issues"),
  );
  const response = await app.request("/", {
    method: "POST",
    body: JSON.stringify({
      nested: { value: false },
      confirmation: "NO",
      values: ["a", "b"],
      title: "",
    }),
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchSnapshot();
});

it("preserves image URL text while accepting existing creation defaults", async () => {
  const app = createApiApp();
  app.openapi(
    createRoute({
      method: "post",
      path: "/",
      middleware: [legacyJsonBody("Invalid input")],
      request: {
        body: {
          required: true,
          content: {
            "application/json": { schema: createLocationInputSchema },
          },
        },
      },
      responses: {
        200: jsonResponse(createLocationInputSchema, "Success"),
        ...errorResponses(400),
      },
    }),
    async (c) => {
      const value = c.req.valid("json");
      return c.json(value, 200);
    },
    validationHook("Invalid input", "issues"),
  );
  const response = await app.request("/", {
    method: "POST",
    body: JSON.stringify({
      regionId: "city-1",
      name: "Place",
      description: "Description",
      images: [" https://example.com/image.png "],
    }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    regionId: "city-1",
    name: "Place",
    description: "Description",
    images: [" https://example.com/image.png "],
    supportedActivityTypes: [],
    status: "draft",
    latitude: null,
    longitude: null,
    coverImageUrl: null,
    extra: {},
  });
});

it.each(["2030-01-01T10:00Z", "2030-01-01T10:00:00.123Z"])(
  "retains accepted UTC timestamp precision: %s",
  async (birthday) => {
    const app = createApiApp();
    app.openapi(
      createRoute({
        method: "post",
        path: "/",
        middleware: [legacyJsonBody("Invalid input")],
        request: {
          body: {
            required: true,
            content: {
              "application/json": {
                schema: z.object({
                  birthday: utcDateTimeSchema.nullable().optional(),
                }),
              },
            },
          },
        },
        responses: {
          200: jsonResponse(
            z.object({ birthday: utcDateTimeSchema.nullable().optional() }),
            "Success",
          ),
          ...errorResponses(400),
        },
      }),
      async (c) => {
        const value = c.req.valid("json");
        return c.json(value, 200);
      },
      validationHook("Invalid input", "issues"),
    );
    const response = await app.request("/", {
      method: "POST",
      body: JSON.stringify({ birthday }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ birthday });
  },
);

it("keeps query defaults, coercion and stripped unknown keys at the HTTP boundary", async () => {
  const app = createApiApp();
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(12),
    enabled: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .prefault("true"),
  });
  app.openapi(
    createRoute({
      method: "get",
      path: "/",
      request: { query: schema },
      responses: {
        200: jsonResponse(
          z.object({ limit: z.number(), enabled: z.boolean() }),
          "Success",
        ),
        ...errorResponses(400),
      },
    }),
    (c) => c.json(c.req.valid("query"), 200),
    validationHook("Invalid query", "issues"),
  );
  const defaults = await app.request("/?unknown=ignored");
  expect(await defaults.json()).toEqual({ limit: 12, enabled: true });
  const query = await app.request("/?limit=20&enabled=false");
  expect(await query.json()).toEqual({ limit: 20, enabled: false });
  const invalid = await app.request("/?limit=0");
  expect(invalid.status).toBe(400);
});
