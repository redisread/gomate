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
    expect(document).toMatchObject({
      paths: {
        "/api/teams/{id}/join": { post: { operationId: "teamsJoin" } },
        "/api/teams": {
          get: {
            parameters: expect.arrayContaining([
              expect.objectContaining({
                name: "tagIds",
                schema: expect.objectContaining({ type: "string" }),
              }),
            ]),
          },
        },
      },
    });
    expect(document).not.toHaveProperty(["paths", "/api/teams/{id}/checklist"]);
    expect(document).not.toHaveProperty([
      "paths",
      "/api/teams/{id}/join-requests",
    ]);
  });
});
