import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { utcDateTimeSchema } from "@/contracts/input-formats";
import { updateTeamSchema } from "../routes/teams/mutations";
import {
  createLocationInputSchema,
  updateLocationInputSchema,
} from "../routes/locations/utils";
import { APIErrors } from "./api-errors";
import { apiValidator, validateRequest } from "./validation";

describe("apiValidator", () => {
  it("returns the existing validation error envelope with issue details", async () => {
    const app = new Hono();
    app.post(
      "/",
      apiValidator(
        "json",
        z.object({ name: z.string().min(1) }),
        "Invalid input",
        "issues",
      ),
      (c) => c.json({ success: true }),
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
    const app = new Hono();
    app.get(
      "/",
      apiValidator(
        "query",
        z.object({ page: z.string().regex(/^\\d+$/) }),
        "Invalid query",
        "flatten",
      ),
      (c) => c.json({ success: true }),
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
    const app = new Hono();
    app.post("/", async (c) => {
      const result = await validateRequest(
        c,
        "json",
        z.object({ name: z.string() }),
        "Invalid input",
        "issues",
      );
      if (result instanceof Response) return result;
      return c.json({ success: true, name: result.name });
    });

    const response = await app.request("/", {
      method: "POST",
      body: JSON.stringify({ name: "Victor" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
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
    const app = new Hono();
    app.post("/", async (c) => {
      const input = await validateRequest(c, "json", schema, "Invalid input");
      return input instanceof Response ? input : c.json(input);
    });
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
  const app = new Hono();
  app.put("/", async (c) => {
    const value = await validateRequest(
      c,
      "json",
      updateLocationInputSchema,
      "Invalid input",
    );
    return value instanceof Response ? value : c.json(value);
  });
  const response = await app.request("/", {
    method: "PUT",
    body: JSON.stringify({ id: "loc-1", name: " New name " }),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ id: "loc-1", name: "New name" });
});

it("accepts the existing compact timezone offset on team updates", async () => {
  const app = new Hono();
  app.put("/", async (c) => {
    const value = await validateRequest(
      c,
      "json",
      updateTeamSchema,
      "Invalid input",
    );
    return value instanceof Response ? value : c.json(value);
  });
  const body = { startAt: "2030-01-01T10:00:00+0800" };
  const response = await app.request("/", {
    method: "PUT",
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(body);
});

it("preserves nested union, literal and authored error details", async () => {
  const app = new Hono();
  const schema = z.object({
    nested: z.object({ value: z.union([z.string(), z.null()]) }),
    confirmation: z.literal("DELETE"),
    values: z.array(z.string()).max(1),
    title: z.string().min(2, "标题太短"),
  });
  app.post("/", async (c) => {
    const value = await validateRequest(c, "json", schema, "Invalid input");
    return value instanceof Response ? value : c.json(value);
  });
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
  const app = new Hono();
  app.post("/", async (c) => {
    const value = await validateRequest(
      c,
      "json",
      createLocationInputSchema,
      "Invalid input",
    );
    return value instanceof Response ? value : c.json(value);
  });
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
    const app = new Hono();
    app.post("/", async (c) => {
      const value = await validateRequest(
        c,
        "json",
        z.object({ birthday: utcDateTimeSchema.nullable().optional() }),
        "Invalid input",
      );
      return value instanceof Response ? value : c.json(value);
    });
    const response = await app.request("/", {
      method: "POST",
      body: JSON.stringify({ birthday }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ birthday });
  },
);

it("keeps query defaults, coercion and stripped unknown keys at the HTTP boundary", async () => {
  const app = new Hono();
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(12),
    enabled: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .prefault("true"),
  });
  app.get("/", apiValidator("query", schema, "Invalid query"), (c) =>
    c.json(c.req.valid("query")),
  );
  const defaults = await app.request("/?unknown=ignored");
  expect(await defaults.json()).toEqual({ limit: 12, enabled: true });
  const query = await app.request("/?limit=20&enabled=false");
  expect(await query.json()).toEqual({ limit: 20, enabled: false });
  const invalid = await app.request("/?limit=0");
  expect(invalid.status).toBe(400);
});
