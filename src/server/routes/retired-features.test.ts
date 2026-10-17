import { describe, expect, it } from "vitest";
import { apiApp, type ApiBindings } from "../app";

describe("retired non-core API surface", () => {
  it.each([
    "/favorites/locations",
    "/stories",
    "/contact",
    "/messages",
    "/local-circle/home",
    "/share-image/locales",
    "/share-image/location/location-1?refresh=1",
    "/share-image/location/location-1?preset=custom-css",
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
