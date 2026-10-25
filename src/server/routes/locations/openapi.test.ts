import { describe, expect, it } from "vitest";
import { createApiApp } from "../../lib/openapi";
import locations from "./index";

describe("location API contracts", () => {
  it("registers all location operations through the HTTP mount boundary", () => {
    const app = createApiApp();
    app.route("/locations", locations);
    const document = app.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "Locations", version: "1" },
    });
    expect(
      Object.values(document.paths ?? {}).flatMap((path) =>
        Object.keys(path ?? {}),
      ),
    ).toHaveLength(11);
    const list = document.paths?.["/locations"]?.get;
    expect(list?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "tagIds",
          in: "query",
          schema: expect.objectContaining({ type: "string" }),
        }),
      ]),
    );
    expect(document.paths?.["/locations"]?.post).toMatchObject({
      "x-audience": "admin",
    });
    expect(list).toMatchObject({ "x-audience": "public" });
  });
});

describe("location HTTP validation", () => {
  it("keeps legacy pagination rejection before other query validation", async () => {
    const response = await locations.request("/?page=1&limit=nope");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: "page pagination is not supported; use cursor",
      },
    });
  });
  it("rejects invalid filters with the established flattened error shape", async () => {
    const response = await locations.request("/?limit=0");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid location filters",
        details: {
          formErrors: [],
          fieldErrors: { limit: ["Number must be greater than or equal to 1"] },
        },
      },
    });
  });
});
