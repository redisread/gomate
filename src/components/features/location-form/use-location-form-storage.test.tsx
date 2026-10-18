import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLocationForm } from "./use-location-form";

const { fetchAPI, t } = vi.hoisted(() => ({
  fetchAPI: vi.fn(),
  t: (key: string) => key,
}));
vi.mock("@/lib/api", () => ({ fetchAPI }));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t }) }));
vi.mock("@/lib/regions", () => ({ fetchSelectableRegions: async () => [] }));

const location = {
  id: "location-1",
  name: "Location",
  slug: "location",
  description: "Description",
  regionId: "region-1",
  status: "draft",
  supportedActivityTypes: [],
  images: [],
  extra: {},
  tags: [],
};

beforeEach(() => {
  localStorage.clear();
  fetchAPI.mockImplementation(async (path: string) =>
    Response.json(
      path === "/auth/get-session"
        ? { user: { role: "admin" } }
        : path === "/tags?limit=200"
          ? { success: true, tags: [] }
          : { success: true, location },
    ),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

function denyStorage() {
  for (const method of ["getItem", "setItem", "removeItem"] as const) {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => {
      throw new DOMException("Unavailable", "SecurityError");
    });
  }
}

describe("location form without browser draft storage", () => {
  it("still loads the authoritative form when storage is unavailable", async () => {
    denyStorage();
    const { result } = renderHook(() => useLocationForm("location-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.formData.name).toBe("Location");
    expect(result.current.saveMessage).toBeNull();
  });

  it("keeps a successful API save successful when draft removal fails", async () => {
    const { result } = renderHook(() => useLocationForm("location-1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    denyStorage();
    let saved;
    await act(async () => {
      saved = await result.current.handleSave();
    });
    expect(saved).toEqual({ ok: true });
    expect(result.current.saveMessage?.type).toBe("success");
    expect(result.current.isDirty).toBe(false);
  });
});
