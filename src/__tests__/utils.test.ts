import { describe, it, expect } from "vitest";
import { cn } from "../lib/utils";

describe("cn", () => {
  it("combines conditional classes and lets consumer spacing override defaults", () => {
    expect(cn("px-4 py-2", null, false, { "font-bold": true, hidden: false }, "px-2"))
      .toBe("py-2 font-bold px-2");
  });

  it("allows components to omit additional classes", () => {
    expect(cn()).toBe("");
  });
});
