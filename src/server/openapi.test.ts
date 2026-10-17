import { describe, expect, it } from "vitest";
import { apiApp, type ApiBindings } from "./app";

function bindings(enabled = "true") {
  return {
    APP_URL: "http://localhost:5432",
    WRITE_MODE: "open",
    API_DOCS_ENABLED: enabled,
  } as unknown as ApiBindings;
}

describe("API documentation HTTP boundary", () => {
  it("serves a public OpenAPI contract without business bindings", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/openapi.json"),
      bindings(),
    );
    expect(response.status).toBe(200);
    const spec = await response.json();
    expect(spec).toMatchObject({ openapi: "3.1.0" });
    expect(spec.paths["/locations"].get).toBeDefined();
    expect(spec.paths["/locations"].post).toBeUndefined();
    expect(spec.paths["/admin/users"]).toBeUndefined();
  });

  it.each(["/docs", "/openapi.json", "/admin/docs", "/admin/openapi.json"])(
    "disables %s without changing business health",
    async (path) => {
      const response = await apiApp.fetch(
        new Request(`http://localhost${path}`),
        bindings("false"),
      );
      expect(response.status).toBe(404);
      const health = await apiApp.fetch(
        new Request("http://localhost/health"),
        bindings("false"),
      );
      expect(health.status).toBe(200);
    },
  );
});
