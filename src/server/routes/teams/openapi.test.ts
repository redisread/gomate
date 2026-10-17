import { OpenAPIHono } from "@hono/zod-openapi";
import { describe, expect, it } from "vitest";
import teams from "./index";

describe("team HTTP contracts", () => {
  it("publishes nested membership paths and wire-format filters", async () => {
    const app = new OpenAPIHono().route("/api/teams", teams);
    app.doc31("/openapi.json", {
      openapi: "3.1.0",
      info: { title: "Teams", version: "1" },
    });
    const response = await app.request("/openapi.json");
    expect(response.status).toBe(200);
    const document = await response.json();
    expect(document.paths["/api/teams/{id}/join"].post.operationId).toBe(
      "teamsJoin",
    );
    expect(
      document.paths["/api/teams/{id}/checklist"].put.requestBody.content[
        "application/json"
      ].schema.properties.assignments,
    ).toBeDefined();
    const params = document.paths["/api/teams"].get.parameters;
    expect(
      params.find((p: { name: string }) => p.name === "tagIds").schema.type,
    ).toBe("string");
  });
});
