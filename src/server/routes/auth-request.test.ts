import { describe, expect, it } from "vitest";
import { normalizeBetterAuthUrl } from "./auth";

describe("Better Auth request URL normalization", () => {
  it.each([
    ["http://localhost/sign-up/email", "/api/auth/sign-up/email"],
    ["http://localhost/auth/sign-in/email", "/api/auth/sign-in/email"],
    [
      "http://localhost/api/auth/verify-email?token=value",
      "/api/auth/verify-email?token=value",
    ],
  ])("restores the public auth base path for %s", (input, expected) => {
    const normalized = new URL(normalizeBetterAuthUrl(input));
    expect(`${normalized.pathname}${normalized.search}`).toBe(expected);
  });
});
