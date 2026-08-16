import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createRequestId,
  logger,
  runWithRequestLogContext,
} from "./logger";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("structured Worker logger", () => {
  it("emits one structured object and removes raw error and sensitive metadata", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error("database_connection_failed", {
      error: new Error("password=super-secret for person@example.com"),
      errorType: "D1Error",
      token: "super-secret",
      email: "person@example.com",
    });

    expect(error).toHaveBeenCalledTimes(1);
    const entry = error.mock.calls[0][0];
    expect(entry).toMatchObject({
      event: "database_connection_failed",
      level: "error",
      error: { type: "Error" },
      errorType: "D1Error",
    });
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
    expect(JSON.stringify(entry)).not.toContain("super-secret");
    expect(JSON.stringify(entry)).not.toContain("person@example.com");
    expect(entry).not.toHaveProperty("token");
    expect(entry).not.toHaveProperty("email");
  });

  it("replaces prose or attacker-controlled event names with a stable fallback", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error("person@example.com secret-token");

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ event: "application_error", level: "error" }),
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain("person@example.com");
    expect(JSON.stringify(error.mock.calls)).not.toContain("secret-token");
  });

  it("keeps concurrent request IDs isolated across asynchronous work", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";

    await Promise.all([
      runWithRequestLogContext(first, async () => {
        await Promise.resolve();
        logger.warn("First async warning");
      }),
      runWithRequestLogContext(second, async () => {
        await Promise.resolve();
        logger.warn("Second async warning");
      }),
    ]);

    expect(warn.mock.calls.map(([entry]) => entry.requestId).sort()).toEqual([
      first,
      second,
    ]);
  });

  it("combines a valid CF-Ray with a UUID and ignores unsafe correlation input", () => {
    const fromCloudflare = createRequestId("95ABCDEF01234567-HKG");
    const fromUnsafeInput = createRequestId("person@example.com/../../secret");

    expect(fromCloudflare).toMatch(
      /^95abcdef01234567-hkg-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(fromUnsafeInput).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
    );
    expect(fromUnsafeInput).not.toContain("person");
  });
});
