import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  API_BASE,
  apiPatch,
  apiPost,
  fetchAPI,
  fetchPublicAPI,
  getApiErrorMessage,
} from "../api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("same-origin API client", () => {
  beforeEach(() => mockFetch.mockReset());

  it("uses the fixed /api base and accepts only route-relative resource paths", async () => {
    mockFetch.mockResolvedValue(new Response("{}"));

    expect(API_BASE).toBe("/api");
    await fetchAPI("/teams");
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/teams",
      expect.objectContaining({ credentials: "include", headers: undefined }),
    );

    await expect(fetchAPI("/api/teams")).rejects.toThrow("must not include '/api'");
    await expect(fetchAPI("teams")).rejects.toThrow("must start with '/'");
  });

  it("does not attach credentials or JSON headers to public GETs", async () => {
    mockFetch.mockResolvedValue(new Response("{}"));

    await fetchPublicAPI("/locations?regionId=region-shenzhen");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/locations?regionId=region-shenzhen",
      expect.objectContaining({ credentials: "omit", headers: undefined }),
    );
  });

  it("serializes write bodies and reads the stable nested error envelope", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response('{"success":true}', { status: 200 }))
      .mockResolvedValueOnce(
        new Response('{"success":false,"error":{"code":"CONFLICT","message":"duplicate"}}', {
          status: 409,
          headers: { "content-type": "application/json" },
        }),
      );

    await expect(apiPatch("/users/me", { extra: { city: "region-shenzhen" } })).resolves.toEqual({
      success: true,
    });
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      "/api/users/me",
      expect.objectContaining({
        method: "PATCH",
        body: '{"extra":{"city":"region-shenzhen"}}',
        headers: { "content-type": "application/json" },
      }),
    );

    await expect(apiPost("/teams", {})).rejects.toThrow("duplicate");
  });

  it("projects API error envelopes to one reusable user-facing message", () => {
    expect(
      getApiErrorMessage(
        { error: { code: "CONFLICT", message: "nested" }, message: "legacy" },
        "fallback",
      ),
    ).toBe("nested");
    expect(getApiErrorMessage({ error: "plain" }, "fallback")).toBe("plain");
    expect(getApiErrorMessage({ message: "top-level" }, "fallback")).toBe(
      "top-level",
    );
    expect(getApiErrorMessage(null, "fallback")).toBe("fallback");
  });
});
