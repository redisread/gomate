import { describe, expect, it } from "vitest";

import { buildLocalePath } from "./locale-toggle";

describe("buildLocalePath", () => {
  it("adds, replaces, and removes locale prefixes without changing the route", () => {
    expect(buildLocalePath("/admin/locations/new", "en")).toBe(
      "/en/admin/locations/new",
    );
    expect(buildLocalePath("/en/admin/locations/new", "ja")).toBe(
      "/ja/admin/locations/new",
    );
    expect(buildLocalePath("/ja/admin/locations/new", "zh-CN")).toBe(
      "/admin/locations/new",
    );
  });

  it("preserves the locale home routes", () => {
    expect(buildLocalePath("/", "en")).toBe("/en");
    expect(buildLocalePath("/en", "zh-CN")).toBe("/");
  });
});
