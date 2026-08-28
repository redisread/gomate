import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../lib/auth";

const mocks = vi.hoisted(() => {
  class MockAdminAccessError extends Error {
    constructor(readonly kind: "unauthenticated" | "forbidden") {
      super(kind);
    }
  }

  return {
    MockAdminAccessError,
    createDb: vi.fn(),
    requireAdmin: vi.fn(),
  };
});

vi.mock("../db", () => ({ createDb: mocks.createDb }));
vi.mock("../lib/admin-access", () => ({
  requireAdmin: mocks.requireAdmin,
  adminAccessErrorResponse: (
    c: { json: (body: unknown, status: 401 | 403) => Response },
    error: unknown,
  ) => {
    if (!(error instanceof mocks.MockAdminAccessError)) return null;
    const unauthorized = error.kind === "unauthenticated";
    return c.json(
      {
        success: false,
        error: {
          code: unauthorized ? "UNAUTHORIZED" : "FORBIDDEN",
          message: unauthorized
            ? "Authentication required"
            : "Administrator access required",
        },
      },
      unauthorized ? 401 : 403,
    );
  },
}));

const { tagsRoute } = await import("./tags");
const { uploadRoute } = await import("./upload");

const r2 = {
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
} as unknown as R2Bucket;

const imageOutput = {
  response: () => new Response(
    new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]),
    { headers: { "content-type": "image/webp" } },
  ),
};
const imageTransformer = {
  output: vi.fn().mockResolvedValue(imageOutput),
};
const imageInfo = vi.fn();
const images = {
  info: imageInfo,
  input: vi.fn(() => imageTransformer),
} as unknown as ImagesBinding;

const env = {
  DB: {} as D1Database,
  R2: r2,
  IMAGES: images,
  R2_PUBLIC_URL: "https://media.example.com",
} as unknown as Env;

function tagDb() {
  mocks.createDb.mockReturnValue({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })),
      })),
    })),
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  });
}

function locationImageBody() {
  const form = new FormData();
  form.set(
    "file",
    new File(
      [
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]),
      ],
      "cover.png",
      { type: "image/png" },
    ),
  );
  return form;
}

function locationHeicBody() {
  const form = new FormData();
  form.set(
    "file",
    new File(
      [
        new Uint8Array([
          0x00, 0x00, 0x00, 0x18,
          0x66, 0x74, 0x79, 0x70,
          0x6d, 0x69, 0x66, 0x31,
          0x00, 0x00, 0x00, 0x00,
          0x68, 0x65, 0x69, 0x63,
        ]),
      ],
      "iphone.heic",
      { type: "image/heic" },
    ),
  );
  return form;
}

function mismatchedLocationImageBody() {
  const form = new FormData();
  form.set(
    "file",
    new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47])],
      "renamed.jpg",
      { type: "image/jpeg" },
    ),
  );
  return form;
}

function iphoneTranscodedImageBody() {
  const form = new FormData();
  form.set(
    "file",
    new File(
      [new Uint8Array([0xff, 0xd8, 0xff, 0xd9])],
      "iphone.heic",
      { type: "image/heic" },
    ),
  );
  return form;
}

describe("shared administrator access consumers", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.requireAdmin.mockReset();
    vi.mocked(r2.put).mockClear();
    imageInfo.mockReset();
    imageInfo.mockResolvedValue({
      format: "image/png",
      fileSize: 8,
      width: 1,
      height: 1,
    });
    vi.mocked(images.input).mockClear();
    imageTransformer.output.mockClear();
  });

  it.each([
    ["tag creation", "unauthenticated", 401, "UNAUTHORIZED"],
    ["tag creation", "forbidden", 403, "FORBIDDEN"],
    ["location upload", "unauthenticated", 401, "UNAUTHORIZED"],
    ["location upload", "forbidden", 403, "FORBIDDEN"],
  ] as const)(
    "maps %s access result %s to %i",
    async (consumer, kind, status, code) => {
      mocks.requireAdmin.mockRejectedValue(
        new mocks.MockAdminAccessError(kind),
      );

      const response =
        consumer === "tag creation"
          ? await tagsRoute.request(
              "/",
              {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ name: "徒步" }),
              },
              env,
            )
          : await uploadRoute.request(
              "/location",
              { method: "POST", body: locationImageBody() },
              env,
            );

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code },
      });
    },
  );

  it("creates a tag after the shared adapter authorizes the administrator", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    tagDb();

    const response = await tagsRoute.request(
      "/",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "徒步", slug: "hiking" }),
      },
      env,
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      existing: false,
    });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
  });

  it("uploads a location image under the authorized administrator ID", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: locationImageBody() },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      url: expect.stringContaining("/temp/locations/admin-1/"),
    });
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(vi.mocked(r2.put)).toHaveBeenCalledOnce();
    expect(vi.mocked(images.input)).not.toHaveBeenCalled();
  });

  it("converts an iPhone HEIC image to WebP before storing it", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    imageInfo.mockResolvedValueOnce({
      format: "image/heic",
      fileSize: 20,
      width: 1,
      height: 1,
    });

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: locationHeicBody() },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      size: 12,
      type: "image/webp",
      url: expect.stringMatching(/\.webp$/u),
    });
    expect(vi.mocked(images.input)).toHaveBeenCalledOnce();
    expect(imageTransformer.output).toHaveBeenCalledWith({ format: "image/webp" });
    expect(vi.mocked(r2.put)).toHaveBeenCalledWith(
      expect.stringMatching(/\.webp$/u),
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: "image/webp" } },
    );
  });

  it("accepts iPhone HEIC metadata when the photo library sends JPEG bytes", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    imageInfo.mockResolvedValueOnce({
      format: "image/jpeg",
      fileSize: 4,
      width: 1,
      height: 1,
    });

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: iphoneTranscodedImageBody() },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      size: 4,
      type: "image/jpeg",
      url: expect.stringMatching(/\.jpg$/u),
    });
    expect(imageInfo).toHaveBeenCalledOnce();
    expect(vi.mocked(images.input)).not.toHaveBeenCalled();
    expect(vi.mocked(r2.put)).toHaveBeenCalledWith(
      expect.stringMatching(/\.jpg$/u),
      expect.any(ArrayBuffer),
      { httpMetadata: { contentType: "image/jpeg" } },
    );
  });

  it("stores a decodable image using its detected format instead of its declaration", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: mismatchedLocationImageBody() },
      env,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      type: "image/png",
      url: expect.stringMatching(/\.png$/u),
    });
    expect(vi.mocked(r2.put)).toHaveBeenCalledOnce();
  });

  it.each([
    [9402, "invalid_image_content"],
    [9412, "invalid_image_content"],
    [9413, "invalid_image_content"],
    [9520, "unsupported_image_format"],
  ] as const)(
    "maps Cloudflare image inspection error %i to %s",
    async (code, reason) => {
      mocks.requireAdmin.mockResolvedValue({
        id: "admin-1",
        displayName: "Admin",
        image: null,
      });
      imageInfo.mockRejectedValueOnce(
        Object.assign(new Error("image inspection failed"), { code }),
      );

      const response = await uploadRoute.request(
        "/location",
        { method: "POST", body: mismatchedLocationImageBody() },
        env,
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: {
          code: "BAD_REQUEST",
          details: { reason },
        },
      });
      expect(vi.mocked(r2.put)).not.toHaveBeenCalled();
    },
  );

  it("keeps unexpected Cloudflare inspection failures as server errors", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    imageInfo.mockRejectedValueOnce(new Error("service unavailable"));

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: mismatchedLocationImageBody() },
      env,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INTERNAL_ERROR" },
    });
    expect(vi.mocked(r2.put)).not.toHaveBeenCalled();
  });

  it("rejects decoded SVG content instead of storing an active document", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    imageInfo.mockResolvedValueOnce({ format: "image/svg+xml" });

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: mismatchedLocationImageBody() },
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "BAD_REQUEST",
        details: { reason: "unsupported_image_format" },
      },
    });
    expect(vi.mocked(r2.put)).not.toHaveBeenCalled();
  });

  it("returns a distinct reason when HEIC conversion fails", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    imageInfo.mockResolvedValueOnce({
      format: "image/heic",
      fileSize: 20,
      width: 1,
      height: 1,
    });
    imageTransformer.output.mockRejectedValueOnce(
      Object.assign(new Error("image area too large"), { code: 9413 }),
    );

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: locationHeicBody() },
      env,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "BAD_REQUEST",
        details: { reason: "image_conversion_failed" },
      },
    });
    expect(vi.mocked(r2.put)).not.toHaveBeenCalled();
  });

  it("keeps unexpected Cloudflare conversion failures as server errors", async () => {
    mocks.requireAdmin.mockResolvedValue({
      id: "admin-1",
      displayName: "Admin",
      image: null,
    });
    imageInfo.mockResolvedValueOnce({
      format: "image/heic",
      fileSize: 20,
      width: 1,
      height: 1,
    });
    imageTransformer.output.mockRejectedValueOnce(new Error("service unavailable"));

    const response = await uploadRoute.request(
      "/location",
      { method: "POST", body: locationHeicBody() },
      env,
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INTERNAL_ERROR" },
    });
    expect(vi.mocked(r2.put)).not.toHaveBeenCalled();
  });
});
