import { describe, expect, it } from "vitest";
import { createApiApp } from "../lib/openapi";
import { authRoute } from "./auth";
import type { Env } from "../lib/auth";

const app = createApiApp<{ Bindings: Env }>();
app.route("/api/auth", authRoute);

function request(path: string, method = "POST") {
  return app.request(`/api/auth${path}`, {
    method,
    ...(method === "GET"
      ? {}
      : { headers: { "content-type": "application/json" }, body: "{}" }),
  });
}

describe("controlled authentication routing", () => {
  it.each([
    "/sign-up/email",
    "/sign-in/email",
    "/send-verification-email",
    "/confirm-email",
    "/reset-password",
  ])(
    "%s uses the same bounded validator for canonical and normalized paths",
    async (path) => {
      for (const variant of [
        path,
        `${path}/`,
        path.replace("-", "%2D"),
        path.replace("/", "//"),
      ]) {
        const response = await request(variant);
        expect(response.status, variant).toBe(400);
        expect(await response.json()).toMatchObject({
          error: { code: "VALIDATION_ERROR" },
        });
      }
    },
  );

  it.each([
    "/update-user",
    "/request-password-reset",
    "/verify-email",
    "/change-password",
  ])(
    "%s remains unavailable even through encoded or trailing-slash paths",
    async (path) => {
      for (const variant of [path, `${path}/`, path.replace("-", "%2D")]) {
        expect((await request(variant)).status, variant).toBe(404);
      }
    },
  );

  it("does not widen methods or add a password recovery fallback", async () => {
    expect((await request("/sign-in/email", "GET")).status).toBe(404);
    expect((await request("/get-session", "PUT")).status).toBe(404);
    expect((await request("/forgot-password/")).status).toBe(404);
    expect((await request("/forgot%2Dpassword")).status).toBe(400);
    expect((await request("/forgot-password")).status).toBe(400);
  });
});
