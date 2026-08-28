import { describe, expect, it } from "vitest";
import { apiApp, type ApiBindings } from "./app";

type TestOverrides = Omit<Partial<ApiBindings>, "WRITE_MODE"> & {
  WRITE_MODE?: "open" | "protected";
};

function env(overrides: TestOverrides = {}): ApiBindings {
  return {
    APP_URL: "http://localhost:5432",
    WRITE_MODE: "open",
    ...overrides,
  } as unknown as ApiBindings;
}

describe("API boundary", () => {
  it("returns a health response without a database round trip", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/health"),
      env(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      writeMode: "open",
    });
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("fails closed when the write mode is missing", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/contact", {
        method: "POST",
        body: "{}",
      }),
      env({ WRITE_MODE: undefined }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "WRITE_PROTECTED" },
    });
  });

  it("blocks cookie writes while the deployment is protected", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/contact", {
        method: "POST",
        headers: {
          cookie: "session=present",
          origin: "http://localhost:5432",
          "sec-fetch-site": "same-origin",
        },
        body: "{}",
      }),
      env({ WRITE_MODE: "protected" }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it("allows only the Preview sign-in boundary through write protection", async () => {
    const response = await apiApp.fetch(
      new Request(
        "https://b-feature-login-12345678-gomate.wujiahong2013.workers.dev/auth/sign-in/email",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      ),
      env({
        WRITE_MODE: "protected",
        PREVIEW_HOST_SUFFIX: "wujiahong2013.workers.dev",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("keeps Preview business writes and account mutations protected", async () => {
    const previewEnv = env({
      WRITE_MODE: "protected",
      PREVIEW_HOST_SUFFIX: "wujiahong2013.workers.dev",
    });
    const businessWrite = await apiApp.fetch(
      new Request(
        "https://b-feature-login-12345678-gomate.wujiahong2013.workers.dev/contact",
        { method: "POST", body: "{}" },
      ),
      previewEnv,
    );
    const accountWrite = await apiApp.fetch(
      new Request(
        "https://b-feature-login-12345678-gomate.wujiahong2013.workers.dev/auth/sign-up/email",
        { method: "POST", body: "{}" },
      ),
      previewEnv,
    );

    expect(businessWrite.status).toBe(503);
    expect(accountWrite.status).toBe(503);
  });

  it("keeps unknown API resources inside the JSON error contract", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/does-not-exist"),
      env(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("rejects the public poster refresh bypass", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/share-image/location/location-1?refresh=1"),
      env(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BAD_REQUEST" },
    });
  });

  it("rejects unknown poster presets before rendering", async () => {
    const response = await apiApp.fetch(
      new Request("http://localhost/share-image/location/location-1?preset=custom-css"),
      env(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BAD_REQUEST" },
    });
  });
});
