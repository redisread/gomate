import { describe, expect, it } from "vitest";
import { isSupportedSatoriFontData } from "./load-fonts";

function bytes(...values: number[]): ArrayBuffer {
  return new Uint8Array(values).buffer;
}

describe("isSupportedSatoriFontData", () => {
  it.each([
    ["TrueType", bytes(0x00, 0x01, 0x00, 0x00)],
    ["OpenType", bytes(0x4f, 0x54, 0x54, 0x4f)],
    ["WOFF", bytes(0x77, 0x4f, 0x46, 0x46)],
  ])("accepts %s font data", (_format, data) => {
    expect(isSupportedSatoriFontData(data)).toBe(true);
  });

  it("rejects WOFF2 font data", () => {
    expect(isSupportedSatoriFontData(bytes(0x77, 0x4f, 0x46, 0x32))).toBe(false);
  });

  it("rejects truncated or unknown font data", () => {
    expect(isSupportedSatoriFontData(bytes(0x00, 0x01))).toBe(false);
    expect(isSupportedSatoriFontData(bytes(0x50, 0x4e, 0x47, 0x00))).toBe(false);
  });
});
