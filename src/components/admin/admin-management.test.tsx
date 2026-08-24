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
  fetchSelectableRegions: vi
    .fn()
    .mockResolvedValue([{ id: "region-sz", name: "深圳", level: "city" }]),
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
    api.fetchAPI.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          tags: [
            {
              id: "tag-1",
              name: "亲子",
              slug: "family",
              references: { locations: 2, teams: 1, stories: 0 },
            },
          ],
          pagination: { hasMore: false },
        }),
        { status: 200 },
      ),
    );

    render(<AdminTagsManager />);

    expect(await screen.findByDisplayValue("亲子")).toBeInTheDocument();
    expect(screen.getByText("2 / 1 / 0")).toBeInTheDocument();
  });

  it("disables role changes for the current administrator", async () => {
    api.fetchAPI.mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          users: [
            {
              id: "admin-1",
              name: "Admin",
              nickname: null,
              email: "admin@example.com",
              role: "admin",
              status: "active",
              createdAt: new Date(0).toISOString(),
            },
          ],
          nextCursor: null,
        }),
        { status: 200 },
      ),
    );

    render(<AdminUsersManager adminId="admin-1" />);

    const button = await screen.findByRole("button", {
      name: "admin.management.currentUser",
    });
    expect(button).toBeDisabled();
    expect(
      screen.getByText("enums.userStatus.active · enums.userRole.admin"),
    ).toBeInTheDocument();
  });

  it("does not expose a server diagnostic when changing a user role fails", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            users: [
              {
                id: "user-1",
                name: "Regular user",
                nickname: null,
                email: "user@example.com",
                role: "user",
                status: "active",
                createdAt: new Date(0).toISOString(),
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: "Internal diagnostic text" },
          }),
          { status: 500 },
        ),
      );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminUsersManager adminId="admin-1" />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "admin.management.makeAdmin",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "admin.management.saveFailed",
    );
    expect(
      screen.queryByText("Internal diagnostic text"),
    ).not.toBeInTheDocument();
  });

  it("loads the next cursor page of users without replacing earlier results", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: [
              {
                id: "user-1",
                name: "First user",
                nickname: null,
                email: "first@example.com",
                role: "user",
                status: "active",
                createdAt: new Date(0).toISOString(),
              },
            ],
            nextCursor: "users-page-2",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            users: [
              {
                id: "user-2",
                name: "Second user",
                nickname: null,
                email: "second@example.com",
                role: "user",
                status: "active",
                createdAt: new Date(1).toISOString(),
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        ),
      );

    render(<AdminUsersManager adminId="admin-1" />);
    expect(await screen.findByText("First user")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "admin.management.loadMore",
      }),
    );

    expect(await screen.findByText("Second user")).toBeInTheDocument();
    expect(screen.getByText("First user")).toBeInTheDocument();
    expect(api.fetchAPI).toHaveBeenLastCalledWith(
      "/admin/users?limit=50&cursor=users-page-2",
    );
  });

  it("loads the next cursor page of locations with the applied filters", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            locations: [
              {
                id: "location-1",
                name: "Initial location",
                description: "Initial description",
                status: "draft",
                region: { name: "深圳" },
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            locations: [
              {
                id: "location-2",
                name: "First filtered location",
                description: "First filtered description",
                status: "draft",
                region: { name: "深圳" },
              },
            ],
            nextCursor: "locations-page-2",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            locations: [
              {
                id: "location-3",
                name: "Second filtered location",
                description: "Second filtered description",
                status: "draft",
                region: { name: "深圳" },
              },
            ],
            nextCursor: null,
          }),
          { status: 200 },
        ),
      );

    render(<AdminLocationsManager />);
    expect(await screen.findByText("Initial location")).toBeInTheDocument();
    fireEvent.change(
      screen.getByLabelText("admin.locationsManagement.search"),
      {
        target: { value: "trail" },
      },
    );
    fireEvent.change(
      screen.getByLabelText("admin.locationsManagement.status"),
      {
        target: { value: "draft" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "admin.management.search",
      }),
    );

    expect(
      await screen.findByText("First filtered location"),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "admin.management.loadMore",
      }),
    );

    expect(
      await screen.findByText("Second filtered location"),
    ).toBeInTheDocument();
    expect(screen.getByText("First filtered location")).toBeInTheDocument();
    expect(api.fetchAPI).toHaveBeenLastCalledWith(
      "/locations/admin?limit=100&search=trail&status=draft&cursor=locations-page-2",
    );
  });

  it("loads the next numbered page of tags without replacing earlier results", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tags: [
              {
                id: "tag-1",
                name: "First tag",
                slug: "first-tag",
                references: { locations: 0, teams: 0, stories: 0 },
              },
            ],
            pagination: { page: 1, pageSize: 200, hasMore: true },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tags: [
              {
                id: "tag-2",
                name: "Second tag",
                slug: "second-tag",
                references: { locations: 0, teams: 0, stories: 0 },
              },
            ],
            pagination: { page: 2, pageSize: 200, hasMore: false },
          }),
          { status: 200 },
        ),
      );

    render(<AdminTagsManager />);
    expect(await screen.findByDisplayValue("First tag")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "admin.management.loadMore",
      }),
    );

    expect(await screen.findByDisplayValue("Second tag")).toBeInTheDocument();
    expect(screen.getByDisplayValue("First tag")).toBeInTheDocument();
    expect(api.fetchAPI).toHaveBeenLastCalledWith(
      "/tags?includeReferences=true&pageSize=200&page=2",
    );
  });

  it("saves the three required quick fields as a server draft", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ tags: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            location: { id: "location-1", status: "draft" },
          }),
          { status: 201 },
        ),
      );
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
    fireEvent.click(
      screen.getByRole("button", { name: "admin.quickDraft.save" }),
    );

    await waitFor(() =>
      expect(api.fetchAPI).toHaveBeenLastCalledWith("/locations", {
        method: "POST",
        body: JSON.stringify({
          name: "灵感地点",
          description: "刚刚想到，先记录下来",
          regionId: "region-sz",
          status: "draft",
          supportedActivityTypes: [],
          coverImageUrl: null,
        }),
      }),
    );
    expect(
      await screen.findByText("admin.quickDraft.saved"),
    ).toBeInTheDocument();
  });

  it("keeps the saved draft when optional tag attachment fails", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tags: [{ id: "tag-1", name: "亲子", slug: "family" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            location: { id: "location-1", status: "draft" },
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: "tag update failed" },
          }),
          { status: 500 },
        ),
      );

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
    fireEvent.click(
      screen.getByRole("button", { name: "admin.quickDraft.save" }),
    );

    expect(
      await screen.findByText("admin.quickDraft.saved"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "admin.quickDraft.optionalSaveFailed",
    );
  });

  it("archives a location through the default delete action", async () => {
    api.fetchAPI
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            locations: [
              {
                id: "location-1",
                name: "梧桐山",
                description: "地点介绍",
                status: "published",
                region: { name: "深圳" },
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            id: "location-1",
            status: "archived",
          }),
          { status: 200 },
        ),
      );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminLocationsManager />);
    fireEvent.click(
      await screen.findByRole("button", {
        name: "admin.locationsManagement.archive",
      }),
    );

    await waitFor(() =>
      expect(api.fetchAPI).toHaveBeenLastCalledWith("/locations/location-1", {
        method: "DELETE",
      }),
    );
  });
});
