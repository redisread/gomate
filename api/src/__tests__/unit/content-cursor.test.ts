import { describe, expect, it } from "vitest";

import {
  decodeContentCursor,
  encodeContentCursor,
} from "../../lib/content-cursor";

describe("content cursor", () => {
  it("round-trips a timestamp and stable id as opaque base64url", () => {
    const encoded = encodeContentCursor({
      t: 1_723_456_789_012,
      id: "story_A-1",
    });

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(decodeContentCursor(encoded)).toEqual({
      t: 1_723_456_789_012,
      id: "story_A-1",
    });
  });

  it.each([
    "not-base64!",
    btoa(JSON.stringify({ t: -1, id: "story" })),
    encodeContentCursor({ t: 8_640_000_000_000_001, id: "story" }),
    btoa(JSON.stringify({ t: Date.now(), id: "" })),
    btoa(JSON.stringify({ t: "now", id: "story" })),
  ])("rejects malformed cursors without throwing: %s", (cursor) => {
    expect(decodeContentCursor(cursor)).toBeNull();
  });
});
