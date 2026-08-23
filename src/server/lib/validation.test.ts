import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { z } from "zod";

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
