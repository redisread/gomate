import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateTeamClient } from "../components/features/create-team-client";
import type { ActivityType, Location } from "../lib/types";

const { fetchAPI, fetchCurrentUser } = vi.hoisted(() => ({
  fetchAPI: vi.fn(),
  fetchCurrentUser: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  fetchAPI,
  fetchCurrentUser,
  getApiErrorMessage: (_data: unknown, fallback: string) => fallback,
}));

vi.mock("@/hooks/useI18n", () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string>) =>
      key === "teams.recommendedActivityType"
        ? `${vars?.name} recommended`
        : key === "enums.locationType.hiking"
          ? "徒步"
        : key === "enums.locationType.travel"
          ? "旅行"
          : key === "enums.locationType.explore"
            ? "探索"
            : key === "enums.locationType.leisure"
              ? "休闲"
        : key,
    locale: "zh-CN",
    loading: false,
    getNsData: () => null,
  }),
}));

vi.mock("@/components/layout/navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));
vi.mock("@/components/features/teams/shared/team-location-preview", () => ({
  TeamLocationPreview: () => null,
}));

function location(
  id: string,
  supportedActivityTypes: ActivityType[],
): Location {
  return {
    id,
    regionId: "region-sz",
    name: id === "location-a" ? "多类型地点 A" : "多类型地点 B",
    slug: id,
    supportedActivityTypes,
    status: "published",
    subtitle: null,
    description: "测试地点",
    address: null,
    latitude: 22.5,
    longitude: 114,
    coverImageUrl: "https://gomate.example/location.jpg",
    images: [],
    extra: {},
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  };
}

const locationA = location("location-a", ["hiking", "travel"]);
const locationB = location("location-b", ["hiking", "explore"]);

function jsonResponse(body: unknown): Response {
  return { json: async () => body } as Response;
}

function arrangeRequests() {
  fetchCurrentUser.mockResolvedValue({
    id: "leader",
    extra: { wechat: "gomate-leader" },
  });
  fetchAPI.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/locations?limit=20") {
      return jsonResponse({ success: true, locations: [locationA, locationB] });
    }
    if (path === `/locations?search=${encodeURIComponent(locationB.name)}&limit=20`) {
      return jsonResponse({ success: true, locations: [locationB] });
    }
    if (path === `/locations/${locationA.id}`) {
      return jsonResponse({ success: true, location: locationA });
    }
    if (path === `/locations/${locationB.id}`) {
      return jsonResponse({ success: true, location: locationB });
    }
    if (path === "/teams" && init?.method === "POST") {
      return jsonResponse({ success: false });
    }
    throw new Error(`Unexpected request: ${path}`);
  });
}

async function selectLocation(name: string) {
  fireEvent.click(await screen.findByTestId("create-team-location"));
  fireEvent.click(await screen.findByRole("option", { name: new RegExp(name) }));
}

describe("CreateTeamClient contract", () => {
  afterEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/teams/create");
  });

  it("prioritizes location recommendations without filtering the code enum", async () => {
    arrangeRequests();
    render(<CreateTeamClient />);

    await selectLocation(locationA.name);

    const activitySelect = await screen.findByRole("combobox", {
      name: "teams.formLabel.activityType",
    });
    expect(activitySelect).toHaveValue("");
    expect(
      await screen.findByRole("option", { name: "徒步 recommended" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "旅行 recommended" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "探索" }),
    ).toBeInTheDocument();

    fireEvent.change(activitySelect, { target: { value: "travel" } });
    expect(activitySelect).toHaveValue("travel");

    await selectLocation(locationB.name);
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "teams.formLabel.activityType" }),
      ).toHaveValue("");
    });
    expect(
      screen.getByRole("option", { name: "旅行" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "探索 recommended" }),
    ).toBeInTheDocument();
  });

  it("submits the explicitly selected activity type and trimmed non-empty requirements", async () => {
    arrangeRequests();
    render(<CreateTeamClient />);

    await selectLocation(locationA.name);
    const activitySelect = await screen.findByRole("combobox", {
      name: "teams.formLabel.activityType",
    });
    fireEvent.change(activitySelect, { target: { value: "explore" } });
    fireEvent.change(screen.getByTestId("create-team-title"), {
      target: { value: "周末旅行" },
    });
    fireEvent.change(screen.getByTestId("create-team-date"), {
      target: { value: "2099-08-16" },
    });
    fireEvent.change(screen.getByTestId("create-team-time"), {
      target: { value: "09:30" },
    });
    fireEvent.change(screen.getByTestId("create-team-max-members"), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByTestId("create-team-description"), {
      target: { value: "一起旅行" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "teams.formLabel.requirements" }),
      { target: { value: "  自备饮用水  \n   \n 防晒用品 \n" } },
    );

    fireEvent.click(screen.getByTestId("create-team-submit"));

    await waitFor(() => {
      expect(fetchAPI).toHaveBeenCalledWith(
        "/teams",
        expect.objectContaining({ method: "POST" }),
      );
    });
    const createCall = fetchAPI.mock.calls.find(([path]) => path === "/teams");
    expect(createCall).toBeDefined();
    const payload = JSON.parse((createCall?.[1] as RequestInit).body as string);
    expect(payload).toMatchObject({
      locationId: locationA.id,
      activityType: "explore",
      requirements: ["自备饮用水", "防晒用品"],
    });
  });

  it("searches published locations by name before selection", async () => {
    arrangeRequests();
    render(<CreateTeamClient />);

    fireEvent.click(await screen.findByTestId("create-team-location"));
    fireEvent.change(
      screen.getByRole("combobox", { name: "teams.locationSearchLabel" }),
      { target: { value: locationB.name } },
    );

    await waitFor(() => {
      expect(fetchAPI).toHaveBeenCalledWith(
        `/locations?search=${encodeURIComponent(locationB.name)}&limit=20`,
      );
    });

    fireEvent.click(
      await screen.findByRole("option", { name: new RegExp(locationB.name) }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("create-team-location")).toHaveTextContent(
        locationB.name,
      );
      expect(fetchAPI).toHaveBeenCalledWith(`/locations/${locationB.id}`);
    });
  });

  it("supports keyboard selection and restores focus to the picker", async () => {
    arrangeRequests();
    render(<CreateTeamClient />);

    const picker = await screen.findByTestId("create-team-location");
    fireEvent.click(picker);
    await screen.findByRole("option", { name: new RegExp(locationA.name) });
    const search = screen.getByRole("combobox", {
      name: "teams.locationSearchLabel",
    });
    fireEvent.keyDown(search, { key: "ArrowDown" });
    fireEvent.keyDown(search, { key: "Enter" });

    await waitFor(() => {
      expect(picker).toHaveTextContent(locationA.name);
      expect(picker).toHaveFocus();
    });
  });
});
