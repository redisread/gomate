import { describe, expect, it } from "vitest";
import { resolveLoginReturnPath } from "./login-return-path";
describe("login return paths", () => {
  it.each([
    "/teams/team-1?source=share",
    "/locations?city=shenzhen",
    "/admin/locations/new",
    "/en/teams/1",
  ])("preserves a same-origin destination %s", (value) => {
    expect(resolveLoginReturnPath(value)).toBe(value);
  });
  it.each([
    null,
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/api/auth/sign-out",
    "/login",
    "/en/login",
    "/foo\nbar",
  ])("rejects unsafe or looping destinations %s", (value) => {
    expect(resolveLoginReturnPath(value)).toBe("/");
  });
});
