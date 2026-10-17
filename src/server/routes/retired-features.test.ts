import { describe, expect, it } from "vitest";
import { apiApp, type ApiBindings } from "../app";

describe("retired non-core API surface", () => {
  it.each([
    "/favorites/locations",
    "/stories",
    "/messages",
    "/local-circle/home",
    "/share-image/locales",
  ])("%s is no longer an API", async (path) => {
    const response = await apiApp.request(path, {}, {
      WRITE_MODE: "open",
      APP_URL: "http://localhost",
    } as unknown as ApiBindings);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
