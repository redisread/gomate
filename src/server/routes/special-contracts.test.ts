import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BrowserSessionSchema,
  BrowserSignInSchema,
} from "@/contracts/auth-api";
import type { Env } from "../lib/auth";

const mocks = vi.hoisted(() => ({
  handler: vi.fn(),
  getSession: vi.fn(),
  active: vi.fn(),
  enforceActive: vi.fn(),
}));
vi.mock("../lib/auth", () => ({
  createAuth: () => ({
    handler: mocks.handler,
    api: { getSession: mocks.getSession },
  }),
}));
vi.mock("../lib/active-session", () => ({ getActiveSession: mocks.active }));
vi.mock("../lib/session-policy", () => ({
  enforceActiveSession: mocks.enforceActive,
}));
const { authRoute } = await import("./auth");
const { uploadRoute } = await import("./upload");
const env = {
  APP_URL: "http://localhost:5432",
  AUTH_SIGN_IN_RATE_LIMITER: { limit: async () => ({ success: true }) },
  R2_PUBLIC_URL: "https://images.example.com",
  R2: {},
} as unknown as Env;
const user = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  emailVerified: true,
  image: null,
  createdAt: "2026-10-17T00:00:00.000Z",
  updatedAt: "2026-10-17T00:00:00.000Z",
};
const json = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.active.mockResolvedValue(null);
  mocks.enforceActive.mockResolvedValue(true);
});

describe("controlled authentication and upload contracts", () => {
  it("describes the actual mounted operations without invoking handlers", () => {
    const auth = authRoute.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "Auth", version: "1" },
    });
    const upload = uploadRoute.getOpenAPI31Document({
      openapi: "3.1.0",
      info: { title: "Upload", version: "1" },
    });
    expect(
      Object.values(auth.paths ?? {}).flatMap((item) =>
        Object.keys(item ?? {}),
      ),
    ).toHaveLength(12);
    expect(
      Object.values(upload.paths ?? {}).flatMap((item) =>
        Object.keys(item ?? {}),
      ),
    ).toHaveLength(4);
    expect(auth.paths?.["/sign-in/email"]?.post).toMatchObject({
      "x-validation-mode": "bounded-json",
    });
    expect(upload.paths?.["/location"]?.post).toMatchObject({
      "x-audience": "admin",
      "x-validation-mode": "bounded-multipart",
    });
    expect(mocks.handler).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
  });
  it("keeps sign-in's browser response consistent with its shared contract", async () => {
    mocks.handler.mockResolvedValue(
      json({ redirect: false, token: "private-token", user }),
    );
    const response = await authRoute.request(
      "/sign-in/email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "ada@example.com",
          password: "password123",
        }),
      },
      env,
    );
    expect(response.status).toBe(200);
    const payload: unknown = await response.json();
    expect(BrowserSignInSchema.safeParse(payload).success).toBe(true);
    expect(payload).not.toHaveProperty("token");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("validates serialized session fields without exposing bearer metadata", async () => {
    mocks.getSession.mockResolvedValue(
      json({
        user,
        session: {
          id: "s1",
          userId: "u1",
          expiresAt: "2026-10-18T00:00:00.000Z",
          createdAt: "2026-10-17T00:00:00.000Z",
          updatedAt: "2026-10-17T00:00:00.000Z",
          token: "private-token",
          ipAddress: "192.0.2.1",
          userAgent: "private-agent",
        },
      }),
    );
    const response = await authRoute.request("/get-session", {}, env);
    const payload: unknown = await response.json();
    expect(BrowserSessionSchema.safeParse(payload).success).toBe(true);
    expect(payload).not.toHaveProperty("session.token");
    expect(payload).not.toHaveProperty("session.ipAddress");
    expect(payload).not.toHaveProperty("session.userAgent");
  });
  it("retains strict auth media types and bounded streaming reads", async () => {
    const wrongType = await authRoute.request(
      "/sign-in/email",
      { method: "POST", body: "{}" },
      env,
    );
    expect(wrongType.status).toBe(415);
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++;
        controller.enqueue(new Uint8Array(16 * 1024 + 1));
      },
    });
    const response = await authRoute.fetch(
      new Request(
        "http://localhost/sign-in/email",
        Object.assign(
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          },
          { duplex: "half" },
        ),
      ),
      env,
    );
    expect(response.status).toBe(413);
    expect(pulls).toBeLessThanOrEqual(2);
    expect(mocks.handler).not.toHaveBeenCalled();
  });
  it("rejects an unauthenticated malformed multipart request before parsing", async () => {
    const response = await uploadRoute.request(
      "/story",
      {
        method: "POST",
        headers: { "content-type": "multipart/form-data" },
        body: "malformed",
      },
      env,
    );
    expect(response.status).toBe(401);
  });
  it("enforces the total multipart bound before decoding file data", async () => {
    mocks.active.mockResolvedValue({ user: { id: "u1" } });
    let pulls = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls++;
        controller.enqueue(new Uint8Array(5 * 1024 * 1024 + 64 * 1024 + 1));
      },
    });
    const response = await uploadRoute.fetch(
      new Request(
        "http://localhost/story",
        Object.assign(
          {
            method: "POST",
            headers: { "content-type": "multipart/form-data; boundary=test" },
            body,
          },
          { duplex: "half" },
        ),
      ),
      env,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: { details: { reason: "file_too_large" } },
    });
    expect(pulls).toBeLessThanOrEqual(2);
  });
  it("preserves avatar deletion's session failure envelope before query validation", async () => {
    mocks.active.mockRejectedValue(new Error("session unavailable"));
    const response = await uploadRoute.request(
      "/avatar",
      { method: "DELETE" },
      env,
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to delete avatar" },
    });
  });
});
