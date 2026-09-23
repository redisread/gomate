import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../../lib/auth";

const mocks = vi.hoisted(() => ({
  createDb: vi.fn(),
  findOpenCityRegion: vi.fn(),
  locationImagesAreAllowed: vi.fn(),
  prepareLocationMedia: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("../../db", () => ({ createDb: mocks.createDb }));
vi.mock("../../lib/admin-access", () => ({
  requireAdmin: mocks.requireAdmin,
  adminAccessErrorResponse: () => null,
}));
vi.mock("../../lib/location-media", () => {
  class MockLocationMediaError extends Error {
    status = 400 as const;
  }

  return {
    backupLocationMedia: vi.fn(),
    discardLocationMediaBackups: vi.fn(),
    discardPreparedLocationMedia: vi.fn(),
    finalizeLocationMedia: vi.fn(),
    LocationMediaError: MockLocationMediaError,
    ownedLocationMediaKeys: vi.fn(() => []),
    prepareLocationMedia: mocks.prepareLocationMedia,
    restoreLocationMediaBackups: vi.fn(),
  };
});
vi.mock("../../lib/r2-media", () => ({
  deleteR2ObjectsWithRetry: vi.fn(),
  getR2PublicBaseUrl: vi.fn(() => "https://media.example.com"),
}));
vi.mock("./utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./utils")>();
  return {
    ...actual,
    findOpenCityRegion: mocks.findOpenCityRegion,
    locationImagesAreAllowed: mocks.locationImagesAreAllowed,
  };
});

const { default: mutations } = await import("./mutations");

const existingLocation = {
  id: "location-1",
  regionId: "region-1",
  name: "Existing location",
  slug: "existing-location",
  supportedActivityTypes: [],
  status: "draft",
  subtitle: null,
  description: "Existing description",
  address: null,
  latitude: null,
  longitude: null,
  coverImageUrl: null,
  images: [],
  extra: {},
  createdByUserId: "admin-1",
  createdAt: new Date(1_000),
  updatedAt: new Date(2_000),
};

function envWithChanges(changes = 1): Env {
  const run = vi.fn().mockResolvedValue({ meta: { changes } });
  const bind = vi.fn(() => ({ run }));
  return {
    DB: { prepare: vi.fn(() => ({ bind })) } as unknown as D1Database,
  } as Env;
}

function dbWithSelectPages(pages: unknown[][]) {
  let page = 0;
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockImplementation(() => Promise.resolve(pages[page++] ?? [])),
        })),
      })),
    })),
  };
}

function validCreateBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    regionId: "region-1",
    name: "New location",
    description: "New description",
    ...overrides,
  });
}

describe("administrator location mutation error reasons", () => {
  beforeEach(() => {
    mocks.createDb.mockReset();
    mocks.findOpenCityRegion.mockReset();
    mocks.locationImagesAreAllowed.mockReset();
    mocks.prepareLocationMedia.mockReset();
    mocks.requireAdmin.mockReset();
    mocks.requireAdmin.mockResolvedValue({ id: "admin-1" });
    mocks.locationImagesAreAllowed.mockReturnValue(true);
    mocks.prepareLocationMedia.mockResolvedValue({
      coverImageUrl: null,
      images: [],
    });
  });

  it("classifies a disallowed location image host", async () => {
    mocks.locationImagesAreAllowed.mockReturnValue(false);

    const response = await mutations.request(
      "/",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: validCreateBody({ coverImageUrl: "https://images.example.com/cover.jpg" }),
      },
      envWithChanges(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        details: { reason: "location_image_host_disallowed" },
      },
    });
  });

  it("classifies an invalid or disabled city region", async () => {
    mocks.createDb.mockReturnValue({});
    mocks.findOpenCityRegion.mockResolvedValue(null);

    const response = await mutations.request(
      "/",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: validCreateBody(),
      },
      envWithChanges(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "BAD_REQUEST",
        details: { reason: "location_invalid_region" },
      },
    });
  });

  it("classifies a concurrent location update", async () => {
    mocks.createDb.mockReturnValue(dbWithSelectPages([[existingLocation]]));
    mocks.findOpenCityRegion.mockResolvedValue({ id: "region-1" });

    const response = await mutations.request(
      "/",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "location-1", name: "Updated name" }),
      },
      envWithChanges(0),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        details: { reason: "location_changed_concurrently" },
      },
    });
  });

  it("rejects an update that leaves only one coordinate", async () => {
    mocks.createDb.mockReturnValue(dbWithSelectPages([[existingLocation]]));

    const response = await mutations.request(
      "/",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "location-1", latitude: 22.5 }),
      },
      envWithChanges(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
    });
    expect(mocks.findOpenCityRegion).not.toHaveBeenCalled();
  });

  it("classifies a concurrent archive", async () => {
    const database = dbWithSelectPages([[existingLocation]]) as ReturnType<typeof dbWithSelectPages> & {
      update: ReturnType<typeof vi.fn>;
    };
    database.update = vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([]),
        })),
      })),
    }));
    mocks.createDb.mockReturnValue(database);

    const response = await mutations.request(
      "/location-1",
      { method: "DELETE" },
      envWithChanges(),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        details: { reason: "location_changed_concurrently" },
      },
    });
  });

  it("preserves reference counts when permanent deletion is blocked", async () => {
    mocks.createDb.mockReturnValue(dbWithSelectPages([
      [existingLocation],
      [{ teams: 2, stories: 1, favorites: 3 }],
    ]));

    const response = await mutations.request(
      "/location-1?permanent=true&confirm=location-1",
      { method: "DELETE" },
      envWithChanges(),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        details: { reason: "location_has_references" },
      },
      references: { teams: 2, stories: 1, favorites: 3 },
    });
  });
});
