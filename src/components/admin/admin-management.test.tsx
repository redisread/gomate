import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminTagsManager } from "./admin-tags-manager";
import { AdminUsersManager } from "./admin-users-manager";
import { AdminLocationsManager } from "./admin-locations-manager";
import { AdminQuickLocationForm } from "./admin-quick-location-form";

const api = vi.hoisted(() => ({
  fetchAPI: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock("@/lib/api", () => api);
vi.mock("@/lib/regions", () => ({
  fetchSelectableRegions: vi.fn().mockResolvedValue([
    { id: "region-sz", name: "深圳", level: "city" },
  ]),
}));

const translate = (key: string) => key;
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: translate }),
}));

describe("admin catalog managers", () => {
  beforeEach(() => {
    api.fetchAPI.mockReset();
    api.apiPost.mockReset();
    api.apiPatch.mockReset();
    api.apiPut.mockReset();
  });

  it("shows tag reference counts before deletion", async () => {
    api.fetchAPI.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      tags: [{
        id: "tag-1",
        name: "亲子",
        slug: "family",
        references: { locations: 2, teams: 1, stories: 0 },
      }],
      pagination: { hasMore: false },
    }), { status: 200 }));

    render(<AdminTagsManager />);

    expect(await screen.findByDisplayValue("亲子")).toBeInTheDocument();
    expect(screen.getByText("2 / 1 / 0")).toBeInTheDocument();
  });

  it("disables role changes for the current administrator", async () => {
    api.fetchAPI.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      users: [{
        id: "admin-1",
        name: "Admin",
        nickname: null,
        email: "admin@example.com",
        role: "admin",
        status: "active",
        createdAt: new Date(0).toISOString(),
      }],
      nextCursor: null,
    }), { status: 200 }));

    render(<AdminUsersManager adminId="admin-1" />);

    const button = await screen.findByRole("button", {
      name: "admin.management.currentUser",
    });
    expect(button).toBeDisabled();
  });

  it("saves the three required quick fields as a server draft", async () => {
    api.fetchAPI.mockResolvedValueOnce(
      new Response(JSON.stringify({ tags: [] }), { status: 200 }),
    );
    api.apiPost.mockResolvedValue({
      success: true,
      location: { id: "location-1", status: "draft" },
    });
    const initialFocusRef = { current: null };

    render(<AdminQuickLocationForm initialFocusRef={initialFocusRef} />);
    fireEvent.change(screen.getByLabelText("admin.quickDraft.name"), {
      target: { value: "灵感地点" },
    });
    fireEvent.change(screen.getByLabelText("admin.quickDraft.description"), {
      target: { value: "刚刚想到，先记录下来" },
    });
    await screen.findByRole("option", { name: "深圳" });
    fireEvent.change(screen.getByLabelText("admin.quickDraft.region"), {
      target: { value: "region-sz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "admin.quickDraft.save" }));

    await waitFor(() => expect(api.apiPost).toHaveBeenCalledWith("/locations", {
      name: "灵感地点",
      description: "刚刚想到，先记录下来",
      regionId: "region-sz",
      status: "draft",
      supportedActivityTypes: [],
      coverImageUrl: null,
    }));
    expect(await screen.findByText("admin.quickDraft.saved")).toBeInTheDocument();
  });

  it("keeps the saved draft when optional tag attachment fails", async () => {
    api.fetchAPI.mockResolvedValueOnce(new Response(JSON.stringify({
      tags: [{ id: "tag-1", name: "亲子", slug: "family" }],
    }), { status: 200 }));
    api.apiPost.mockResolvedValue({
      success: true,
      location: { id: "location-1", status: "draft" },
    });
    api.apiPut.mockRejectedValue(new Error("tag update failed"));

    render(<AdminQuickLocationForm initialFocusRef={{ current: null }} />);
    fireEvent.change(screen.getByLabelText("admin.quickDraft.name"), {
      target: { value: "灵感地点" },
    });
    fireEvent.change(screen.getByLabelText("admin.quickDraft.description"), {
      target: { value: "刚刚想到，先记录下来" },
    });
    await screen.findByRole("option", { name: "深圳" });
    fireEvent.change(screen.getByLabelText("admin.quickDraft.region"), {
      target: { value: "region-sz" },
    });
    fireEvent.click(screen.getByText("admin.quickDraft.optionalFields"));
    fireEvent.click(await screen.findByLabelText("亲子"));
    fireEvent.click(screen.getByRole("button", { name: "admin.quickDraft.save" }));

    expect(await screen.findByText("admin.quickDraft.saved")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "admin.quickDraft.optionalSaveFailed",
    );
  });

  it("archives a location through the default delete action", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(new Response(JSON.stringify({
        locations: [{
          id: "location-1",
          name: "梧桐山",
          description: "地点介绍",
          status: "published",
          region: { name: "深圳" },
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        id: "location-1",
        status: "archived",
      }), { status: 200 }));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminLocationsManager />);
    fireEvent.click(await screen.findByRole("button", {
      name: "admin.locationsManagement.archive",
    }));

    await waitFor(() => expect(api.fetchAPI).toHaveBeenLastCalledWith(
      "/locations/location-1",
      { method: "DELETE" },
    ));
  });
});
