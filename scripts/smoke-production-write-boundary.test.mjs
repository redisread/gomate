import assert from "node:assert/strict";
import test from "node:test";
import { assertOpenWriteBoundary } from "./smoke-production-write-boundary.mjs";

test("accepts an open production boundary", () => {
  assert.doesNotThrow(() =>
    assertOpenWriteBoundary({
      health: {
        status: 200,
        headers: { "x-worker-version-id": "version-1" },
        body: { status: "ok", writeMode: "open", versionId: "version-1" },
      },
      signup: {
        status: 400,
        body: { success: false, error: { code: "VALIDATION_ERROR" } },
      },
    }),
  );
});

test("rejects a protected production boundary", () => {
  assert.throws(
    () =>
      assertOpenWriteBoundary({
        health: {
          status: 200,
          headers: { "x-worker-version-id": "version-1" },
          body: { status: "ok", writeMode: "protected", versionId: "version-1" },
        },
        signup: {
          status: 503,
          body: { success: false, error: { code: "WRITE_PROTECTED" } },
        },
      }),
    /writeMode=open/u,
  );
});
