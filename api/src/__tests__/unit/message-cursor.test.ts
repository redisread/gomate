import { describe, expect, it } from "vitest";

import { decodeMessageCursor, encodeMessageCursor } from "../../lib/message-cursor";

describe("message cursor", () => {
  it("round-trips the timestamp and stable id as opaque base64url", () => {
    const cursor = encodeMessageCursor({ t: 1_725_000_000_123, id: "msg_abc-123" });

    expect(cursor).not.toContain("{");
    expect(cursor).not.toMatch(/[+/=]/);
    expect(decodeMessageCursor(cursor)).toEqual({ t: 1_725_000_000_123, id: "msg_abc-123" });
  });

  it.each(["", "not-base64!", "e30", "eyJ0IjotMSwiaWQiOiJ4In0"])(
    "rejects malformed cursor %s",
    (cursor) => {
      expect(() => decodeMessageCursor(cursor)).toThrow("INVALID_MESSAGE_CURSOR");
    },
  );

  it.each([
    "a".repeat(513),
    btoa(JSON.stringify({ t: 1.5, id: "message" })),
    btoa(JSON.stringify({ t: 8_640_000_000_000_001, id: "message" })),
    btoa(JSON.stringify({ t: 1, id: "m".repeat(201) })),
    btoa(JSON.stringify({ t: 1, id: "message", extra: true })),
  ])("rejects oversized or non-canonical cursor payloads before query use", (cursor) => {
    expect(() => decodeMessageCursor(cursor)).toThrow("INVALID_MESSAGE_CURSOR");
  });
});
