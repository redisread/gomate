import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminActivityTypesManager } from "./admin-activity-types-manager";
import { AdminTagsManager } from "./admin-tags-manager";
import { AdminUsersManager } from "./admin-users-manager";

const api = vi.hoisted(() => ({
  fetchAPI: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

vi.mock("@/lib/api", () => api);

const translate = (key: string) => key;
vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({ t: translate }),
}));

describe("admin catalog managers", () => {
  beforeEach(() => {
    api.fetchAPI.mockReset();
    api.apiPost.mockReset();
    api.apiPatch.mockReset();
  });

  it("shows activity reference counts and allows deactivation", async () => {
    api.fetchAPI.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      activityTypes: [{
        id: "hiking",
        name: "徒步",
        slug: "hiking",
        isActive: true,
        sortOrder: 10,
        references: { teams: 2, locations: 3 },
      }],
    }), { status: 200 }));
    api.apiPatch.mockResolvedValue({
      success: true,
      activityType: {
        id: "hiking",
        name: "徒步",
        slug: "hiking",
        isActive: false,
        sortOrder: 10,
      },
    });

    render(<AdminActivityTypesManager />);

    expect(await screen.findByDisplayValue("徒步")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "admin.management.deactivate",
    }));
    await waitFor(() => expect(api.apiPatch).toHaveBeenCalledWith(
      "/activity-types/hiking",
      { isActive: false },
    ));
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
});
