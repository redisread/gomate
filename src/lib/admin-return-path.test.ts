import { describe, expect, it } from "vitest";

import { resolveAdminReturnPath } from "./admin-return-path";

describe("resolveAdminReturnPath", () => {
  it.each([
    ["/admin", "/admin"],
    ["/admin/locations/new", "/admin/locations/new"],
    [
      "/admin/locations/new?source=navbar&mode=quick",
      "/admin/locations/new?source=navbar&mode=quick",
    ],
    ["/admin/locations/new#draft", "/admin/locations/new"],
  ])("allows the safe administrator path %s", (input, expected) => {
    expect(resolveAdminReturnPath(input)).toBe(expected);
  });

  it.each([
    null,
    "",
    "/",
    "/locations",
    "/administrator",
    "/en/admin",
    "https://evil.example/admin",
    "//evil.example/admin",
    "\\evil.example\\admin",
    "/admin\\evil",
    "%2Fadmin",
    "/%2Fadmin",
    "/admin/%2e%2e/profile",
    "/admin\u0000/locations",
  ])("rejects unsafe return path %s", (input) => {
    expect(resolveAdminReturnPath(input)).toBe("/");
  });
});
