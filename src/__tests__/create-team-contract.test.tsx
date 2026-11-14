import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  refreshCurrentUser: fetchCurrentUser,
  getApiErrorMessage: (_data: unknown, fallback: string) => fallback,
}));

afterEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

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
    if (
      path ===
      `/locations?search=${encodeURIComponent(locationB.name)}&limit=20`
    ) {
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
  fireEvent.click(
    await screen.findByRole("option", { name: new RegExp(name) }),
  );
}

async function fillCreation() {
  await selectLocation(locationA.name);
  fireEvent.change(await screen.findByTestId("create-team-activity-type"), { target: { value: "explore" } });
  fireEvent.change(screen.getByTestId("create-team-title"), { target: { value: "唯一的一次创建" } });
  fireEvent.change(screen.getByTestId("create-team-date"), { target: { value: "2099-08-16" } });
  fireEvent.change(screen.getByTestId("create-team-max-members"), { target: { value: "6" } });
  fireEvent.change(screen.getByTestId("create-team-description"), { target: { value: "一起出发" } });
}

it("retries the exact persisted creation after a lost response and a page reopen", async () => {
  arrangeRequests();
  const ordinary = fetchAPI.getMockImplementation()!;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => path === "/teams"
    ? Promise.reject(new Error("response lost")) : ordinary(path, init));
  const first = render(<CreateTeamClient />);
  await fillCreation();
  fireEvent.click(screen.getByTestId("create-team-submit"));
  await screen.findByRole("button", { name: "teams.retryOriginalCreate" });
  const sent = fetchAPI.mock.calls.find(([path]) => path === "/teams")![1].body;
  expect(JSON.parse(sent).requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(screen.queryByTestId("create-team-title")).toBeNull();
  expect(screen.getByRole("link", { name: "teams.checkMyTeams" })).toHaveAttribute("href", "/my-teams");
  first.unmount();
  render(<CreateTeamClient />);
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => path === "/teams"
    ? Promise.resolve({ status: 400, json: async () => ({ success: false }) }) : ordinary(path, init));
  fireEvent.click(await screen.findByRole("button", { name: "teams.retryOriginalCreate" }));
  await waitFor(() => expect(fetchAPI.mock.calls.filter(([path]) => path === "/teams")).toHaveLength(2));
  expect(fetchAPI.mock.calls.filter(([path]) => path === "/teams")[1][1].body).toBe(sent);
  await waitFor(() => expect(screen.getByRole("button", { name: "teams.retryOriginalCreate" })).toBeEnabled());
  expect(screen.queryByTestId("create-team-title")).toBeNull();
});

it("does not send a creation when durable tab storage is unavailable", async () => {
  arrangeRequests();
  render(<CreateTeamClient />);
  await fillCreation();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  fireEvent.click(screen.getByTestId("create-team-submit"));
  await screen.findByText("teams.createStorageUnavailable");
  expect(fetchAPI.mock.calls.some(([path]) => path === "/teams")).toBe(false);
});

it("does not restore another account's pending creation", async () => {
  arrangeRequests();
  const ordinary = fetchAPI.getMockImplementation()!;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => path === "/teams"
    ? Promise.reject(new Error("lost")) : ordinary(path, init));
  const first = render(<CreateTeamClient />);
  await fillCreation();
  fireEvent.click(screen.getByTestId("create-team-submit"));
  await screen.findByRole("button", { name: "teams.retryOriginalCreate" });
  first.unmount();
  fetchCurrentUser.mockResolvedValue({ id: "another-user", extra: { wechat: "other" } });
  render(<CreateTeamClient />);
  expect(await screen.findByTestId("create-team-title")).toHaveValue("");
  expect(screen.queryByRole("button", { name: "teams.retryOriginalCreate" })).toBeNull();
});

it("does not send a pending creation under a changed account", async () => {
  arrangeRequests();
  render(<CreateTeamClient />);
  await fillCreation();
  fetchCurrentUser.mockResolvedValue({ id: "other-user", extra: { wechat: "other" } });
  fireEvent.click(screen.getByTestId("create-team-submit"));
  await screen.findByRole("alert");
  expect(fetchAPI.mock.calls.some(([path]) => path === "/teams")).toBe(false);
});

it("allows corrected input with a new identity after an initial definite rejection", async () => {
  arrangeRequests();
  const ordinary = fetchAPI.getMockImplementation()!;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => path === "/teams"
    ? Promise.resolve({ status: 400, json: async () => ({ success: false }) }) : ordinary(path, init));
  render(<CreateTeamClient />);
  await fillCreation();
  fireEvent.click(screen.getByTestId("create-team-submit"));
  const title = await screen.findByTestId("create-team-title");
  fireEvent.change(title, { target: { value: "修正后的队伍" } });
  fireEvent.click(screen.getByTestId("create-team-submit"));
  await waitFor(() => expect(fetchAPI.mock.calls.filter(([path]) => path === "/teams")).toHaveLength(2));
  const sent = fetchAPI.mock.calls.filter(([path]) => path === "/teams").map(([, init]) => JSON.parse(init.body));
  expect(sent[0].requestId).not.toBe(sent[1].requestId);
  expect(sent[1].title).toBe("修正后的队伍");
});

it("only releases an unknown creation after explicit reconciliation confirmation", async () => {
  arrangeRequests();
  const ordinary = fetchAPI.getMockImplementation()!;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => path === "/teams"
    ? Promise.reject(new Error("lost")) : ordinary(path, init));
  render(<CreateTeamClient />);
  await fillCreation();
  fireEvent.click(screen.getByTestId("create-team-submit"));
  const discard = await screen.findByRole("button", { name: "teams.discardCheckedCreate" });
  const saved = sessionStorage.getItem("gomate.team-create.leader");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(discard);
  expect(sessionStorage.getItem("gomate.team-create.leader")).toBe(saved);
  expect(screen.queryByTestId("create-team-title")).toBeNull();
  confirm.mockReturnValue(true);
  fireEvent.click(discard);
  expect(await screen.findByTestId("create-team-title")).toHaveValue("唯一的一次创建");
  expect(sessionStorage.getItem("gomate.team-create.leader")).toBeNull();
});

it("preserves a corrupt record until the user explicitly discards it", async () => {
  arrangeRequests();
  sessionStorage.setItem("gomate.team-create.leader", "{broken");
  render(<CreateTeamClient />);
  const discard = await screen.findByRole("button", { name: "teams.discardCheckedCreate" });
  expect(sessionStorage.getItem("gomate.team-create.leader")).toBe("{broken");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(discard);
  await waitFor(() => expect(screen.getByTestId("create-team-submit")).toBeEnabled());
  expect(sessionStorage.getItem("gomate.team-create.leader")).toBeNull();
});

it("rechecks identity on focus without treating an unavailable identity service as logout", async () => {
  arrangeRequests();
  const ordinary = fetchAPI.getMockImplementation()!;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => path === "/teams"
    ? Promise.reject(new Error("lost")) : ordinary(path, init));
  render(<CreateTeamClient />);
  await fillCreation();
  fireEvent.click(screen.getByTestId("create-team-submit"));
  await screen.findByRole("button", { name: "teams.retryOriginalCreate" });
  const saved = sessionStorage.getItem("gomate.team-create.leader");
  fetchCurrentUser.mockRejectedValue(new Error("identity unavailable"));
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(sessionStorage.getItem("gomate.team-create.leader")).toBe(saved);
  expect(screen.getByRole("button", { name: "teams.retryOriginalCreate" })).toBeVisible();
  fetchCurrentUser.mockResolvedValue(null);
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(sessionStorage.getItem("gomate.team-create.leader")).toBeNull();
  expect(screen.queryByText("唯一的一次创建")).toBeNull();
});

describe("CreateTeamClient contract", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/teams/create");
  });

  it.each([
    [2026, 10, 14, 7],
    [2026, 10, 14, 22],
    [2026, 11, 31, 22],
  ])("defaults to four hours ahead in local time (%i/%i/%i %i:00)", async (year, month, day, hour) => {
    const now = new Date(year, month, day, hour, 0);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    arrangeRequests();
    render(<CreateTeamClient />);
    const date = await screen.findByTestId("create-team-date");
    const time = screen.getByTestId("create-team-time");
    const start = new Date(`${(date as HTMLInputElement).value}T${(time as HTMLInputElement).value}:00`);
    expect(start.getTime() - now.getTime()).toBe(4 * 60 * 60 * 1000);
    const today = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    expect(date).toHaveAttribute("min", today);
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
    expect(screen.getByRole("option", { name: "探索" })).toBeInTheDocument();

    fireEvent.change(activitySelect, { target: { value: "travel" } });
    expect(activitySelect).toHaveValue("travel");

    await selectLocation(locationB.name);
    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: "teams.formLabel.activityType" }),
      ).toHaveValue("");
    });
    expect(screen.getByRole("option", { name: "旅行" })).toBeInTheDocument();
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
      target: { value: "  周末旅行  " },
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
      target: { value: "  一起旅行  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /teams.formSupplementary/ }),
    );
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
      title: "周末旅行",
      description: "一起旅行",
      maxParticipants: 6,
      meetingPoint: null,
      startAt: new Date("2099-08-16T09:30:00").toISOString(),
      endAt: new Date("2099-08-16T13:30:00").toISOString(),
      recruitmentStatus: "open",
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
      expect(fetchAPI).toHaveBeenCalledWith(
        `/locations/${locationB.id}`,
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
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

it("shows a selected location detail failure and allows retry", async () => {
  arrangeRequests();
  const normalFetch = fetchAPI.getMockImplementation()!;
  let fail = true;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => {
    if (path === `/locations/${locationA.id}` && fail)
      return Promise.reject(new Error("offline"));
    return normalFetch(path, init);
  });
  render(<CreateTeamClient />);
  await selectLocation(locationA.name);
  expect(
    await screen.findByText("teams.locationDetailLoadFailed"),
  ).toBeTruthy();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "common.retry" }));
  await waitFor(() =>
    expect(screen.queryByText("teams.locationDetailLoadFailed")).toBeNull(),
  );
  expect(await screen.findByTestId("create-team-activity-type")).toBeTruthy();
});

it("cancels an old location detail request and ignores its late failure", async () => {
  arrangeRequests();
  const normalFetch = fetchAPI.getMockImplementation()!;
  let rejectOld!: (reason: Error) => void;
  let oldSignal: AbortSignal | undefined;
  fetchAPI.mockImplementation((path: string, init?: RequestInit) => {
    if (path === `/locations/${locationA.id}`) {
      oldSignal = init?.signal as AbortSignal;
      return new Promise((_resolve, reject) => {
        rejectOld = reject;
      });
    }
    return normalFetch(path, init);
  });
  const { unmount } = render(<CreateTeamClient />);
  await selectLocation(locationA.name);
  await selectLocation(locationB.name);
  expect(oldSignal?.aborted).toBe(true);
  rejectOld(new Error("old failure"));
  await waitFor(() =>
    expect(screen.getByTestId("create-team-activity-type")).toBeTruthy(),
  );
  expect(screen.queryByText("teams.locationDetailLoadFailed")).toBeNull();
  const detailCall = fetchAPI.mock.calls.find(
    ([path]) => path === `/locations/${locationB.id}`,
  );
  unmount();
  expect(detailCall?.[1]?.signal.aborted).toBe(true);
});

it("preserves the selected destination through login", async () => {
  arrangeRequests();
  window.history.replaceState({}, "", "/en/teams/create?locationId=location-a");
  render(<CreateTeamClient />);
  await waitFor(() => expect(fetchCurrentUser).toHaveBeenCalled());
  const loginUrl = new URL(
    fetchCurrentUser.mock.calls.at(-1)![0],
    window.location.origin,
  );
  expect(loginUrl.searchParams.get("returnTo")).toBe(
    "/en/teams/create?locationId=location-a",
  );
});

it("keeps activity input while saving a missing contact and retrying a failure", async () => {
  window.history.replaceState({}, "", "/teams/create");
  vi.clearAllMocks();
  arrangeRequests();
  fetchCurrentUser.mockResolvedValue({ id: "leader", extra: {} });
  const ordinaryFetch = fetchAPI.getMockImplementation()!;
  let fail = true;
  fetchAPI.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === "/users/me" && init?.method === "PATCH") {
      return new Response(
        JSON.stringify(
          fail
            ? { success: false }
            : { success: true, user: { extra: { wechat: "my-wechat" } } },
        ),
        { status: fail ? 503 : 200 },
      );
    }
    return ordinaryFetch(path, init);
  });
  render(<CreateTeamClient />);
  fireEvent.change(await screen.findByTestId("create-team-title"), {
    target: { value: "周末去湖边" },
  });
  await selectLocation(locationA.name);
  fireEvent.change(await screen.findByTestId("create-team-activity-type"), {
    target: { value: "travel" },
  });
  fireEvent.change(screen.getByLabelText("teams.contactWechatLabel"), {
    target: { value: " my-wechat " },
  });
  fireEvent.click(screen.getByRole("button", { name: "teams.saveContact" }));
  await screen.findByRole("alert");
  expect(screen.getByTestId("create-team-title")).toHaveValue("周末去湖边");
  expect(screen.getByTestId("create-team-submit")).toBeDisabled();
  fail = false;
  fireEvent.click(screen.getByRole("button", { name: "teams.saveContact" }));
  await waitFor(() =>
    expect(screen.getByTestId("create-team-submit")).toBeEnabled(),
  );
  expect(screen.getByTestId("create-team-title")).toHaveFocus();
  expect(screen.getByTestId("create-team-title")).toHaveValue("周末去湖边");
  expect(screen.getByTestId("create-team-activity-type")).toHaveValue("travel");
  expect(fetchAPI).toHaveBeenCalledWith(
    "/users/me",
    expect.objectContaining({
      body: JSON.stringify({ extra: { wechat: "my-wechat" } }),
    }),
  );
  expect(fetchAPI.mock.calls.some(([path]) => path === "/teams")).toBe(false);
});

it("keeps supplementary fields collapsed until requested and preserves their input", async () => {
  window.history.replaceState({}, "", "/teams/create");
  arrangeRequests();
  render(<CreateTeamClient />);
  const toggle = await screen.findByRole("button", {
    name: /teams.formSupplementary/,
  });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(toggle);
  const meeting = await screen.findByLabelText("teams.meetingPoint");
  fireEvent.change(meeting, { target: { value: "北门集合" } });
  fireEvent.click(toggle);
  fireEvent.click(toggle);
  expect(screen.getByLabelText("teams.meetingPoint")).toHaveValue("北门集合");
});
