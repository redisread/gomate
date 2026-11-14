import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditTeamClient } from "../components/features/edit-team-client";

const { fetchAPI, fetchCurrentUser, t } = vi.hoisted(() => ({
  fetchAPI: vi.fn(),
  fetchCurrentUser: vi.fn(),
  t: (key: string) => key,
}));
vi.mock("@/lib/api", () => ({
  fetchAPI,
  fetchCurrentUser,
  refreshCurrentUser: fetchCurrentUser,
  getApiErrorMessage: (_: unknown, fallback: string) => fallback,
}));
vi.mock("@/hooks/useI18n", () => ({ useI18n: () => ({ t }) }));
vi.mock("@/components/layout/navbar", () => ({ Navbar: () => null }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => null }));

const team = {
  version: 3,
  id: "team-1",
  leaderId: "leader",
  title: "原队伍",
  locationId: "location-1",
  activityType: "hiking",
  startAt: "2099-08-16T01:30:00.000Z",
  endAt: "2099-08-16T05:30:00.000Z",
  maxParticipants: 6,
  activeParticipantCount: 3,
  description: "原描述",
  meetingPoint: "入口",
  requirements: ["饮水"],
};
function arrange(leaderId = "leader") {
  fetchCurrentUser.mockResolvedValue({ id: leaderId });
  fetchAPI.mockImplementation(async (_path: string, init?: RequestInit) => ({
    status: 200,
    json: async () =>
      init?.method === "PUT" ? { success: false } : { success: true, team },
  }));
}
async function form() {
  render(<EditTeamClient teamId="team-1" />);
  const title = await screen.findByDisplayValue("原队伍");
  return { title, element: title.closest("form")! };
}
afterEach(() => vi.clearAllMocks());

describe("EditTeamClient contract", () => {
  it("keeps location/date locked and submits trimmed fields without an unchanged activity type", async () => {
    arrange();
    const { title, element } = await form();
    expect(element.querySelector('[name="startDateInput"]')).toBeNull();
    expect(element.querySelector('[name="locationId"]')).toBeNull();
    fireEvent.change(title, { target: { value: "  新队名  " } });
    fireEvent.change(screen.getByDisplayValue("原描述"), {
      target: { value: "  新介绍  " },
    });
    fireEvent.change(screen.getByDisplayValue("入口"), {
      target: { value: "  新入口  " },
    });
    fireEvent.change(screen.getByDisplayValue("饮水"), {
      target: { value: "  饮水  " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "teams.editAddRequirement" }),
    );
    fireEvent.submit(element);
    await screen.findByText("errors.editTeamSaveFailed");
    const call = fetchAPI.mock.calls.find(
      ([, init]) => init?.method === "PUT",
    )!;
    const payload = JSON.parse(call[1].body);
    expect(payload).toEqual({
      expectedVersion: 3,
      title: "新队名",
      description: "新介绍",
      meetingPoint: "新入口",
      requirements: ["饮水"],
      maxParticipants: 6,
      startAt: team.startAt,
      endAt: team.endAt,
    });
    expect(title).toHaveValue("  新队名  ");
    expect(
      screen.getByRole("button", { name: "teams.editSaveBtn" }),
    ).toBeEnabled();
  });

  it("rejects capacity below existing participants even when native validation is bypassed", async () => {
    arrange();
    const { element } = await form();
    fireEvent.change(element.querySelector('[name="maxParticipants"]')!, {
      target: { value: "2" },
    });
    fireEvent.submit(element);
    await screen.findByText("errors.maxMembersBelowCurrent");
    expect(
      fetchAPI.mock.calls.filter(([, init]) => init?.method === "PUT"),
    ).toHaveLength(0);
  });

  it("submits a changed activity and caps editable requirements at ten", async () => {
    arrange();
    const { element } = await form();
    fireEvent.change(element.querySelector('[name="activityType"]')!, {
      target: { value: "travel" },
    });
    for (let i = 1; i < 10; i++)
      fireEvent.click(
        screen.getByRole("button", { name: "teams.editAddRequirement" }),
      );
    expect(
      screen.queryByRole("button", { name: "teams.editAddRequirement" }),
    ).toBeNull();
    fireEvent.click(
      screen.getAllByRole("button", { name: /teams.formRemoveRequirement/ })[0],
    );
    expect(
      screen.getByRole("button", { name: "teams.editAddRequirement" }),
    ).toBeInTheDocument();
    fireEvent.submit(element);
    await waitFor(() =>
      expect(
        fetchAPI.mock.calls.some(([, init]) => init?.method === "PUT"),
      ).toBe(true),
    );
    const call = fetchAPI.mock.calls.find(
      ([, init]) => init?.method === "PUT",
    )!;
    expect(JSON.parse(call[1].body)).toMatchObject({
      activityType: "travel",
      requirements: [],
    });
  });

  it("does not expose a form to a non-leader", async () => {
    arrange("other-user");
    render(<EditTeamClient teamId="team-1" />);
    await screen.findByText("errors.noPermission");
    expect(
      screen.queryByRole("button", { name: "teams.editSaveBtn" }),
    ).toBeNull();
    expect(fetchAPI).toHaveBeenCalledTimes(1);
  });
});

it("keeps edits on conflict until the user confirms replacement with the latest version", async () => {
  arrange();
  let latest = false;
  fetchAPI.mockImplementation(async (_path: string, init?: RequestInit) => ({
    status: init?.method === "PUT" ? 409 : 200,
    json: async () => init?.method === "PUT" ? { success: false }
      : { success: true, team: latest ? { ...team, title: "服务器新标题", version: 4 } : team },
  }));
  const { title, element } = await form();
  fireEvent.change(title, { target: { value: "我的未提交修改" } });
  fireEvent.submit(element);
  const reload = await screen.findByRole("button", { name: "teams.loadLatestTeam" });
  expect(title).toHaveValue("我的未提交修改");
  latest = true;
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(reload);
  expect(title).toHaveValue("我的未提交修改");
  confirm.mockReturnValue(true);
  fireEvent.click(reload);
  await screen.findByDisplayValue("服务器新标题");
  fireEvent.submit(element);
  await waitFor(() => expect(fetchAPI.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(2));
  expect(JSON.parse(fetchAPI.mock.calls.filter(([, init]) => init?.method === "PUT")[1][1].body).expectedVersion).toBe(4);
  confirm.mockRestore();
});

it.each([
  ["03:00", "90", "teams.duration1_5h"],
  ["03:05", "95", "teams.formDurationMinutes"],
])(
  "opens saved supplementary details and retains duration ending at %s",
  async (endTime, minutes, label) => {
    fetchCurrentUser.mockResolvedValue({ id: "leader" });
    fetchAPI.mockResolvedValue({
      status: 200,
      json: async () => ({
        success: true,
        team: { ...team, endAt: `2099-08-16T${endTime}:00.000Z` },
      }),
    });
    const { element } = await form();
    expect(
      screen.getByRole("button", { name: /teams.formSupplementary/ }),
    ).toHaveAttribute("aria-expanded", "true");
    const duration = element.querySelector('[name="durationMinutes"]');
    expect(duration).toHaveValue(minutes);
    expect(duration?.querySelector("option:checked")).toHaveTextContent(label);
  },
);
