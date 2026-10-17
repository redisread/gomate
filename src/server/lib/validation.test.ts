import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { updateTeamSchema } from "../routes/teams/mutations";
import { updateLocationInputSchema } from "../routes/locations/utils";
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
